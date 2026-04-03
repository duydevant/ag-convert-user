import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';

export interface TokenValidationResult {
  valid: boolean;
  decoded?: {
    sub: string;
    email?: string;
    preferred_username?: string;
    name?: string;
    given_name?: string;
    family_name?: string;
    realm_access?: { roles: string[] };
    resource_access?: Record<string, { roles: string[] }>;
    azp?: string;           // Client ID that requested this token
    iss?: string;           // Issuer (Keycloak realm URL)
    aud?: string | string[]; // Audience
    exp?: number;
    iat?: number;
    scope?: string;
    email_verified?: boolean;
    [key: string]: any;
  };
  error?: string;
  tokenInfo?: {
    issuer: string;
    clientId: string;       // Which client issued this token
    expiresAt: string;
    issuedAt: string;
    remainingSeconds: number;
  };
}

@Injectable()
export class TokenValidationService {
  private readonly logger = new Logger(TokenValidationService.name);
  private readonly jwksClient: JwksClient;
  private readonly expectedIssuer: string;

  constructor(private configService: ConfigService) {
    const baseUrl = configService.get<string>('KEYCLOAK_BASE_URL')!;
    const realm = configService.get<string>('KEYCLOAK_REALM')!;

    this.expectedIssuer = `${baseUrl}/realms/${realm}`;

    // JWKS client fetches public keys from Keycloak's certs endpoint
    // These keys are shared across ALL clients in the realm
    this.jwksClient = new JwksClient({
      jwksUri: `${this.expectedIssuer}/protocol/openid-connect/certs`,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 600000, // 10 minutes
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });

    this.logger.log(`Token validation configured — JWKS: ${this.expectedIssuer}/protocol/openid-connect/certs`);
  }

  /**
   * Validate a Keycloak access token from ANY client in the realm.
   * Uses JWKS (public key) — no client_secret needed.
   */
  async validateToken(token: string): Promise<TokenValidationResult> {
    if (!token) {
      return { valid: false, error: 'Token is empty' };
    }

    // Strip "Bearer " prefix if present
    if (token.startsWith('Bearer ') || token.startsWith('bearer ')) {
      token = token.substring(7);
    }

    try {
      // Step 1: Decode header to get kid (key ID)
      const decodedHeader = jwt.decode(token, { complete: true });
      if (!decodedHeader || typeof decodedHeader === 'string') {
        return { valid: false, error: 'Invalid JWT format — cannot decode header' };
      }

      const kid = decodedHeader.header.kid;
      if (!kid) {
        return { valid: false, error: 'Token header missing kid (key ID)' };
      }

      // Step 2: Fetch the matching public key from Keycloak JWKS endpoint
      const signingKey = await this.jwksClient.getSigningKey(kid);
      const publicKey = signingKey.getPublicKey();

      // Step 3: Verify signature + expiration using the public key
      // We do NOT check audience (aud) because we want to accept tokens from ANY client
      const decoded = jwt.verify(token, publicKey, {
        algorithms: ['RS256'],
        issuer: this.expectedIssuer,
        // No audience check — accept tokens from any client in this realm
      }) as any;

      // Step 4: Build result
      const now = Math.floor(Date.now() / 1000);
      const remainingSeconds = decoded.exp ? decoded.exp - now : 0;

      return {
        valid: true,
        decoded,
        tokenInfo: {
          issuer: decoded.iss,
          clientId: decoded.azp || decoded.client_id || 'unknown',
          expiresAt: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : 'unknown',
          issuedAt: decoded.iat ? new Date(decoded.iat * 1000).toISOString() : 'unknown',
          remainingSeconds,
        },
      };
    } catch (error: any) {
      let errorMessage = error.message || 'Unknown validation error';

      if (error.name === 'TokenExpiredError') {
        errorMessage = `Token expired at ${new Date(error.expiredAt).toISOString()}`;
      } else if (error.name === 'JsonWebTokenError') {
        errorMessage = `Invalid token: ${error.message}`;
      } else if (error.name === 'SigningKeyNotFoundError') {
        errorMessage = `Signing key not found — token may be from a different realm or server`;
      }

      this.logger.warn(`Token validation failed: ${errorMessage}`);
      return { valid: false, error: errorMessage };
    }
  }
}
