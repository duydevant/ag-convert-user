import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class KeycloakService {
  private readonly logger = new Logger(KeycloakService.name);
  private readonly baseUrl: string;
  private readonly realm: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly adminUser: string;
  private readonly adminPassword: string;

  // Token cache
  private adminToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('KEYCLOAK_BASE_URL')!;
    this.realm = this.configService.get<string>('KEYCLOAK_REALM')!;
    this.clientId = this.configService.get<string>('KEYCLOAK_CLIENT_ID')!;
    this.clientSecret = this.configService.get<string>('KEYCLOAK_CLIENT_SECRET')!;
    this.adminUser = this.configService.get<string>('KEYCLOAK_ADMIN_USER') || 'admin';
    this.adminPassword = this.configService.get<string>('KEYCLOAK_ADMIN_PASSWORD') || '';

    const authMode = this.adminPassword ? 'admin credentials (master realm)' : 'client_credentials';
    this.logger.log(`Keycloak configured — ${this.baseUrl}, realm: ${this.realm}, auth: ${authMode}`);
  }

  /**
   * Get Keycloak admin access token
   * Strategy 1: Admin credentials via master realm (recommended for Admin API)
   * Strategy 2: client_credentials via app realm (fallback)
   */
  async getAdminToken(): Promise<string> {
    // Return cached token if still valid
    if (this.adminToken && Date.now() < this.tokenExpiresAt - 30000) {
      return this.adminToken;
    }

    const params = new URLSearchParams();

    if (this.adminPassword) {
      // Strategy 1: Admin user + password via master realm
      params.append('grant_type', 'password');
      params.append('client_id', 'admin-cli');
      params.append('username', this.adminUser);
      params.append('password', this.adminPassword);

      try {
        const response = await axios.post(
          `${this.baseUrl}/realms/master/protocol/openid-connect/token`,
          params.toString(),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
        );
        this.adminToken = response.data.access_token;
        const expiresIn = response.data.expires_in || 300;
        this.tokenExpiresAt = Date.now() + expiresIn * 1000;
        this.logger.log('Keycloak admin token obtained (master realm)');
        return this.adminToken!;
      } catch (error: any) {
        this.logger.error(
          `Master realm auth failed: ${error.response?.data?.error_description || error.message}`,
        );
        throw error;
      }
    }

    // Strategy 2: client_credentials (fallback)
    params.append('grant_type', 'client_credentials');
    params.append('client_id', this.clientId);
    params.append('client_secret', this.clientSecret);

    try {
      const response = await axios.post(
        `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/token`,
        params.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );
      this.adminToken = response.data.access_token;
      const expiresIn = response.data.expires_in || 300;
      this.tokenExpiresAt = Date.now() + expiresIn * 1000;
      return this.adminToken!;
    } catch (error: any) {
      this.logger.error(
        `Keycloak token failed: ${error.response?.data?.error_description || error.message}`,
      );
      throw error;
    }
  }

  /**
   * Find user by email in Keycloak
   */
  async findUserByEmail(email: string): Promise<any | null> {
    const token = await this.getAdminToken();
    const response = await axios.get(
      `${this.baseUrl}/admin/realms/${this.realm}/users`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { email, exact: true },
      },
    );
    return response.data.length > 0 ? response.data[0] : null;
  }

  /**
   * Import a single user (without password)
   */
  async importUser(userData: {
    email: string;
    name?: string;
    email_verified?: boolean;
    user_id?: string;
  }): Promise<{ success: boolean; userId?: string; error?: string }> {
    try {
      const token = await this.getAdminToken();

      // Check if user already exists
      const existing = await this.findUserByEmail(userData.email);
      if (existing) {
        this.logger.log(`User already exists in Keycloak: ${userData.email}`);
        return { success: true, userId: existing.id };
      }

      const nameParts = (userData.name || userData.email).split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const response = await axios.post(
        `${this.baseUrl}/admin/realms/${this.realm}/users`,
        {
          username: userData.email,
          email: userData.email,
          firstName,
          lastName,
          enabled: true,
          emailVerified: userData.email_verified ?? false,
          attributes: {
            auth0_user_id: userData.user_id ? [userData.user_id] : [],
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      // Extract user ID from Location header
      const locationHeader = response.headers['location'] || '';
      const userId = locationHeader.split('/').pop() || '';

      this.logger.log(`User imported to Keycloak: ${userData.email} (ID: ${userId})`);
      return { success: true, userId };
    } catch (error: any) {
      const msg = error.response?.data?.errorMessage || error.message;
      this.logger.error(`Failed to import user ${userData.email}: ${msg}`);
      return { success: false, error: msg };
    }
  }

  /**
   * Import multiple users
   */
  async importUsers(
    usersData: any[],
  ): Promise<{ imported: number; skipped: number; failed: number; details: any[] }> {
    const results = { imported: 0, skipped: 0, failed: 0, details: [] as any[] };

    for (const user of usersData) {
      const result = await this.importUser({
        email: user.email,
        name: user.name,
        email_verified: user.email_verified,
        user_id: user.user_id,
      });

      if (result.success) {
        // Check if it was a new import or already existed
        const existing = await this.findUserByEmail(user.email);
        if (existing) {
          results.imported++;
        }
      } else {
        results.failed++;
      }

      results.details.push({
        email: user.email,
        ...result,
      });
    }

    this.logger.log(
      `Import complete: ${results.imported} imported, ${results.skipped} skipped, ${results.failed} failed`,
    );
    return results;
  }

  /**
   * Set password for a user in Keycloak
   */
  async setUserPassword(
    userId: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const token = await this.getAdminToken();
      await axios.put(
        `${this.baseUrl}/admin/realms/${this.realm}/users/${userId}/reset-password`,
        {
          type: 'password',
          value: password,
          temporary: false,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );
      this.logger.log(`Password set for Keycloak user ${userId}`);
      return { success: true };
    } catch (error: any) {
      const msg = error.response?.data?.errorMessage || error.message;
      this.logger.error(`Failed to set password for user ${userId}: ${msg}`);
      return { success: false, error: msg };
    }
  }

  /**
   * Import a single user with pre-hashed bcrypt password.
   * The hash is stored directly in Keycloak without knowing the plaintext.
   * Requires keycloak-bcrypt provider to be installed.
   */
  async importUserWithBcryptHash(userData: {
    username: string;
    email: string;
    enabled?: boolean;
    firstName?: string;
    lastName?: string;
    bcryptHash: string; // e.g. "$2b$10$YourHashedPasswordHere..."
    hashIterations?: number;
  }): Promise<{ success: boolean; userId?: string; error?: string }> {
    try {
      const token = await this.getAdminToken();

      // Check if user already exists
      const existing = await this.findUserByEmail(userData.email);
      if (existing) {
        this.logger.log(
          `User already exists in Keycloak: ${userData.email}, updating bcrypt credential`,
        );
        // Update credential for existing user
        await this.setBcryptCredential(
          existing.id,
          userData.bcryptHash,
          userData.hashIterations,
        );
        return { success: true, userId: existing.id };
      }

      // Parse iterations from bcrypt hash (e.g. "$2b$10$..." → 10)
      const iterations =
        userData.hashIterations || this.parseBcryptIterations(userData.bcryptHash);

      // Create user in Keycloak
      const response = await axios.post(
        `${this.baseUrl}/admin/realms/${this.realm}/users`,
        {
          username: userData.username,
          email: userData.email,
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          enabled: userData.enabled !== false,
          emailVerified: true,
          credentials: [
            {
              type: 'password',
              credentialData: JSON.stringify({
                hashIterations: iterations,
                algorithm: 'bcrypt',
              }),
              secretData: JSON.stringify({
                value: userData.bcryptHash,
              }),
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      // Extract user ID from Location header
      const locationHeader = response.headers['location'] || '';
      const userId = locationHeader.split('/').pop() || '';

      this.logger.log(
        `User imported with bcrypt hash: ${userData.email} (ID: ${userId})`,
      );
      return { success: true, userId };
    } catch (error: any) {
      const msg =
        error.response?.data?.errorMessage ||
        error.response?.data?.error ||
        error.message;
      this.logger.error(
        `Failed to import user with bcrypt hash ${userData.email}: ${msg}`,
      );
      return { success: false, error: msg };
    }
  }

  /**
   * Set bcrypt credential for an existing user by calling the credentials API
   */
  private async setBcryptCredential(
    userId: string,
    bcryptHash: string,
    iterations?: number,
  ): Promise<void> {
    const token = await this.getAdminToken();
    const parsedIterations = iterations || this.parseBcryptIterations(bcryptHash);

    // First, get existing credentials to remove old password
    const existingCreds = await axios.get(
      `${this.baseUrl}/admin/realms/${this.realm}/users/${userId}/credentials`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    // Remove old password credentials
    for (const cred of existingCreds.data) {
      if (cred.type === 'password') {
        await axios.delete(
          `${this.baseUrl}/admin/realms/${this.realm}/users/${userId}/credentials/${cred.id}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
      }
    }

    // Use partial import-like approach: update user with new credential via PUT
    // Since direct credential creation isn't straightforward, we use a workaround:
    // Delete user credentials and recreate user credentials via admin API
    // Actually, we need to use the internal credential store API

    // The cleanest approach for existing users: use PUT on the user with credentials
    await axios.put(
      `${this.baseUrl}/admin/realms/${this.realm}/users/${userId}`,
      {
        credentials: [
          {
            type: 'password',
            credentialData: JSON.stringify({
              hashIterations: parsedIterations,
              algorithm: 'bcrypt',
            }),
            secretData: JSON.stringify({
              value: bcryptHash,
            }),
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    this.logger.log(`Bcrypt credential updated for user ${userId}`);
  }

  /**
   * Parse bcrypt cost/iterations from hash string.
   * e.g. "$2b$10$..." → 10
   */
  private parseBcryptIterations(hash: string): number {
    const match = hash.match(/^\$2[aby]?\$(\d+)\$/);
    return match ? parseInt(match[1], 10) : 10;
  }

  /**
   * Import multiple users with bcrypt-hashed passwords
   */
  async importUsersWithBcryptHash(
    users: Array<{
      username: string;
      email: string;
      enabled?: boolean;
      firstName?: string;
      lastName?: string;
      credentials: Array<{
        type: string;
        algorithm?: string;
        hashedSaltedValue: string;
        additionalParameters?: { hashIterations?: string };
      }>;
    }>,
  ): Promise<{
    imported: number;
    skipped: number;
    failed: number;
    details: any[];
  }> {
    const results = { imported: 0, skipped: 0, failed: 0, details: [] as any[] };

    for (const user of users) {
      const credential = user.credentials?.[0];
      if (!credential || !credential.hashedSaltedValue) {
        results.failed++;
        results.details.push({
          username: user.username,
          email: user.email,
          success: false,
          error: 'Missing credential data (hashedSaltedValue)',
        });
        continue;
      }

      const hashIterations = credential.additionalParameters?.hashIterations
        ? parseInt(credential.additionalParameters.hashIterations, 10)
        : undefined;

      const result = await this.importUserWithBcryptHash({
        username: user.username,
        email: user.email,
        enabled: user.enabled,
        firstName: user.firstName,
        lastName: user.lastName,
        bcryptHash: credential.hashedSaltedValue,
        hashIterations,
      });

      if (result.success) {
        results.imported++;
      } else {
        results.failed++;
      }

      results.details.push({
        username: user.username,
        email: user.email,
        ...result,
      });
    }

    this.logger.log(
      `Bcrypt import complete: ${results.imported} imported, ${results.failed} failed`,
    );
    return results;
  }

  /**
   * Get all users from Keycloak
   */
  async getAllUsers(): Promise<any[]> {
    const token = await this.getAdminToken();
    const allUsers: any[] = [];
    let first = 0;
    const max = 100;

    while (true) {
      const response = await axios.get(
        `${this.baseUrl}/admin/realms/${this.realm}/users`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { first, max },
        },
      );

      allUsers.push(...response.data);
      if (response.data.length < max) break;
      first += max;
    }

    return allUsers;
  }

  /**
   * Login user with Keycloak (Direct Access Grant) → get access_token + refresh_token
   */
  async loginUser(
    email: string,
    password: string,
  ): Promise<{
    success: boolean;
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
    error?: string;
  }> {
    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'password');
      params.append('client_id', this.clientId);
      params.append('client_secret', this.clientSecret);
      params.append('username', email);
      params.append('password', password);
      params.append('scope', 'openid profile email');

      const response = await axios.post(
        `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/token`,
        params.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );

      this.logger.log(`Keycloak login successful for: ${email}`);
      return {
        success: true,
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in: response.data.expires_in,
        token_type: response.data.token_type,
      };
    } catch (error: any) {
      const msg =
        error.response?.data?.error_description || error.message;
      this.logger.warn(`Keycloak login failed for ${email}: ${msg}`);
      return { success: false, error: msg };
    }
  }

  /**
   * Exchange authorization code for tokens (Authorization Code + PKCE flow)
   */
  async exchangeCodeForTokens(
    code: string,
    redirectUri: string,
    codeVerifier?: string,
  ): Promise<{
    success: boolean;
    access_token?: string;
    refresh_token?: string;
    id_token?: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
    error?: string;
  }> {
    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'authorization_code');
      params.append('client_id', this.clientId);
      params.append('client_secret', this.clientSecret);
      params.append('code', code);
      params.append('redirect_uri', redirectUri);
      if (codeVerifier) {
        params.append('code_verifier', codeVerifier);
      }

      const response = await axios.post(
        `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/token`,
        params.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );

      this.logger.log(`Keycloak code exchange successful`);
      return {
        success: true,
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        id_token: response.data.id_token,
        expires_in: response.data.expires_in,
        token_type: response.data.token_type,
        scope: response.data.scope,
      };
    } catch (error: any) {
      const msg =
        error.response?.data?.error_description || error.message;
      this.logger.error(`Keycloak code exchange failed: ${msg}`);
      return { success: false, error: msg };
    }
  }

  /**
   * Get Keycloak config for frontend
   */
  getConfig() {
    return {
      keycloakBaseUrl: this.baseUrl,
      keycloakRealm: this.realm,
      keycloakClientId: this.clientId,
    };
  }
}
