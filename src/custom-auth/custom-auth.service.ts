import { Injectable, Logger } from '@nestjs/common';
import { Auth0Service } from '../auth0/auth0.service';
import { KeycloakService } from '../keycloak/keycloak.service';

export interface CustomLoginResult {
  success: boolean;
  message: string;
  password_migrated?: boolean;
  auth0?: {
    access_token: string;
    token_type: string;
    expires_in: number;
  };
  keycloak?: {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
  };
  error?: string;
}

@Injectable()
export class CustomAuthService {
  private readonly logger = new Logger(CustomAuthService.name);

  constructor(
    private readonly auth0Service: Auth0Service,
    private readonly keycloakService: KeycloakService,
  ) {}

  /**
   * Full proxy login flow:
   * 1. Authenticate with Auth0
   * 2. Find/create user in Keycloak
   * 3. Migrate password to Keycloak (if not already done)
   * 4. Login to Keycloak
   * 5. Return tokens from both Auth0 and Keycloak
   */
  async proxyLogin(
    email: string,
    password: string,
    name?: string,
  ): Promise<CustomLoginResult> {
    // ─── Step 1: Authenticate with Auth0 ───
    this.logger.log(`[ProxyLogin] Step 1: Authenticating "${email}" with Auth0...`);
    const auth0Result = await this.auth0Service.loginUser(email, password);

    if (!auth0Result.success) {
      this.logger.warn(`[ProxyLogin] Auth0 login failed for "${email}": ${auth0Result.error}`);
      return {
        success: false,
        message: `Auth0 authentication failed: ${auth0Result.error}`,
      };
    }

    this.logger.log(`[ProxyLogin] Step 1 ✅ Auth0 login successful for "${email}"`);

    // ─── Step 2: Find or create user in Keycloak ───
    this.logger.log(`[ProxyLogin] Step 2: Finding user "${email}" in Keycloak...`);
    let keycloakUser = await this.keycloakService.findUserByEmail(email);

    if (!keycloakUser) {
      // Auto-create user in Keycloak if not exists
      this.logger.log(`[ProxyLogin] User not found in Keycloak, creating...`);
      const importResult = await this.keycloakService.importUser({
        email,
        name: name || email,
        email_verified: true,
      });

      if (!importResult.success) {
        return {
          success: false,
          message: `Failed to create user in Keycloak: ${importResult.error}`,
          auth0: {
            access_token: auth0Result.data.access_token,
            token_type: auth0Result.data.token_type || 'Bearer',
            expires_in: auth0Result.data.expires_in,
          },
        };
      }

      keycloakUser = await this.keycloakService.findUserByEmail(email);
    }

    this.logger.log(`[ProxyLogin] Step 2 ✅ Keycloak user found: ${keycloakUser.id}`);

    // ─── Step 3: Migrate password to Keycloak ───
    this.logger.log(`[ProxyLogin] Step 3: Setting password in Keycloak...`);
    const passwordResult = await this.keycloakService.setUserPassword(
      keycloakUser.id,
      password,
    );

    if (!passwordResult.success) {
      this.logger.error(`[ProxyLogin] Failed to set Keycloak password: ${passwordResult.error}`);
      return {
        success: false,
        message: `Password migration failed: ${passwordResult.error}`,
        auth0: {
          access_token: auth0Result.data.access_token,
          token_type: auth0Result.data.token_type || 'Bearer',
          expires_in: auth0Result.data.expires_in,
        },
      };
    }

    this.logger.log(`[ProxyLogin] Step 3 ✅ Password migrated to Keycloak`);

    // ─── Step 4: Login to Keycloak to get tokens ───
    this.logger.log(`[ProxyLogin] Step 4: Logging into Keycloak...`);
    const keycloakResult = await this.keycloakService.loginUser(email, password);

    if (!keycloakResult.success) {
      this.logger.error(`[ProxyLogin] Keycloak login failed: ${keycloakResult.error}`);
      return {
        success: false,
        message: `Keycloak login failed after password migration: ${keycloakResult.error}`,
        password_migrated: true,
        auth0: {
          access_token: auth0Result.data.access_token,
          token_type: auth0Result.data.token_type || 'Bearer',
          expires_in: auth0Result.data.expires_in,
        },
      };
    }

    this.logger.log(`[ProxyLogin] Step 4 ✅ Keycloak login successful`);
    this.logger.log(`[ProxyLogin] 🎉 Full proxy login completed for "${email}"`);

    // ─── Return both tokens ───
    return {
      success: true,
      message: `Login successful. Password migrated to Keycloak for ${email}`,
      password_migrated: true,
      auth0: {
        access_token: auth0Result.data.access_token,
        token_type: auth0Result.data.token_type || 'Bearer',
        expires_in: auth0Result.data.expires_in,
      },
      keycloak: {
        access_token: keycloakResult.access_token!,
        refresh_token: keycloakResult.refresh_token!,
        token_type: keycloakResult.token_type || 'Bearer',
        expires_in: keycloakResult.expires_in!,
      },
    };
  }
}
