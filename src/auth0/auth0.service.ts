import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class Auth0Service {
  private readonly logger = new Logger(Auth0Service.name);
  private readonly domain: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly audience: string;
  private readonly connection: string;

  // Separate M2M credentials for Management API
  private readonly m2mClientId: string;
  private readonly m2mClientSecret: string;

  // Token cache
  private managementToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(private configService: ConfigService) {
    this.domain = this.configService.get<string>('AUTH0_DOMAIN')!;
    this.clientId = this.configService.get<string>('AUTH0_CLIENT_ID')!;
    this.clientSecret = this.configService.get<string>('AUTH0_CLIENT_SECRET')!;
    this.audience = this.configService.get<string>('AUTH0_AUDIENCE')!;
    this.connection = this.configService.get<string>('AUTH0_CONNECTION')!;

    // M2M credentials (fallback to main credentials if not configured)
    this.m2mClientId =
      this.configService.get<string>('AUTH0_M2M_CLIENT_ID') || this.clientId;
    this.m2mClientSecret =
      this.configService.get<string>('AUTH0_M2M_CLIENT_SECRET') ||
      this.clientSecret;

    // Log configuration status
    const hasM2M = !!this.configService.get<string>('AUTH0_M2M_CLIENT_ID');
    this.logger.log(
      `Auth0 configured — Domain: ${this.domain}, M2M app: ${hasM2M ? 'YES (separate)' : 'NO (using main app)'}`,
    );
  }

  /**
   * Get Management API access token (using M2M app credentials)
   * Cached to avoid unnecessary token requests
   */
  async getManagementToken(): Promise<string> {
    // Return cached token if still valid (with 60s buffer)
    if (this.managementToken && Date.now() < this.tokenExpiresAt - 60000) {
      return this.managementToken;
    }

    try {
      const response = await axios.post(
        `https://${this.domain}/oauth/token`,
        {
          grant_type: 'client_credentials',
          client_id: this.m2mClientId,
          client_secret: this.m2mClientSecret,
          audience: this.audience,
        },
      );

      this.managementToken = response.data.access_token;
      // Auth0 tokens typically expire in 86400s (24h)
      const expiresIn = response.data.expires_in || 86400;
      this.tokenExpiresAt = Date.now() + expiresIn * 1000;

      this.logger.log('Management token obtained successfully');
      return this.managementToken!;
    } catch (error: any) {
      const errorData = error.response?.data || {};
      const errorMsg = JSON.stringify(errorData);

      if (
        errorData.error === 'unauthorized_client' ||
        errorData.error === 'access_denied'
      ) {
        this.logger.error(
          `Management API authentication failed: ${errorMsg}\n` +
            `>>> FIX: Bạn cần tạo một Machine-to-Machine app trong Auth0 Dashboard:\n` +
            `1. Auth0 Dashboard → Applications → Create Application → Machine to Machine\n` +
            `2. Authorize nó cho "Auth0 Management API" với scope: read:users\n` +
            `3. Copy Client ID & Client Secret vào .env:\n` +
            `   AUTH0_M2M_CLIENT_ID=<m2m-client-id>\n` +
            `   AUTH0_M2M_CLIENT_SECRET=<m2m-client-secret>`,
        );
      } else {
        this.logger.error(`Failed to get management token: ${errorMsg}`);
      }
      throw new Error(
        `Auth0 Management API token failed: ${errorData.error_description || errorData.error || error.message}. ` +
          `Hãy kiểm tra AUTH0_M2M_CLIENT_ID/AUTH0_M2M_CLIENT_SECRET trong .env`,
      );
    }
  }

  /**
   * Register a new user via Auth0 Authentication API
   * Uses /dbconnections/signup (no special grants required)
   */
  async registerUser(
    email: string,
    password: string,
    name?: string,
  ): Promise<any> {
    try {
      const response = await axios.post(
        `https://${this.domain}/dbconnections/signup`,
        {
          client_id: this.clientId,
          email,
          password,
          name: name || email,
          connection: this.connection,
        },
      );
      this.logger.log(`User registered on Auth0: ${email}`);
      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Auth0 register failed: ${JSON.stringify(error.response?.data || error.message)}`,
      );
      throw error;
    }
  }

  /**
   * Login via multiple strategies (with fallback)
   * Tries: password-realm → password → ro/password
   */
  async loginUser(
    email: string,
    password: string,
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    // Strategy 1: password-realm grant (preferred for DB connections)
    const strategies = [
      {
        name: 'password-realm',
        payload: {
          grant_type: 'http://auth0.com/oauth/grant-type/password-realm',
          username: email,
          password,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          realm: this.connection,
          audience: this.audience,
          scope: 'openid profile email',
        },
      },
      {
        name: 'password',
        payload: {
          grant_type: 'password',
          username: email,
          password,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          audience: this.audience,
          scope: 'openid profile email',
          connection: this.connection,
        },
      },
    ];

    let lastError = '';
    for (const strategy of strategies) {
      try {
        this.logger.debug(`Trying login strategy: ${strategy.name}`);
        const response = await axios.post(
          `https://${this.domain}/oauth/token`,
          strategy.payload,
        );
        this.logger.log(
          `Auth0 login successful for ${email} using strategy: ${strategy.name}`,
        );
        return { success: true, data: response.data };
      } catch (error: any) {
        const errorData = error.response?.data || {};
        const msg = errorData.error_description || error.message;

        // If it's a grant type not allowed error, try next strategy
        if (
          errorData.error === 'unauthorized_client' ||
          errorData.error === 'unsupported_grant_type'
        ) {
          this.logger.warn(
            `Strategy "${strategy.name}" not allowed, trying next...`,
          );
          lastError = msg;
          continue;
        }

        // If it's wrong credentials, don't try other strategies
        if (
          errorData.error === 'invalid_grant' ||
          errorData.error === 'access_denied'
        ) {
          this.logger.warn(
            `Auth0 login failed for ${email}: wrong credentials`,
          );
          return {
            success: false,
            error: 'Email hoặc mật khẩu không đúng',
          };
        }

        // Other errors
        lastError = msg;
        this.logger.warn(
          `Strategy "${strategy.name}" failed for ${email}: ${msg}`,
        );
      }
    }

    // All strategies failed — likely a configuration issue
    this.logger.error(
      `All login strategies failed for ${email}. Last error: ${lastError}\n` +
        `>>> FIX: Trong Auth0 Dashboard → Applications → "${this.clientId}"\n` +
        `→ Settings → Advanced Settings → Grant Types → Bật "Password" grant`,
    );
    return {
      success: false,
      error: `Tất cả phương thức login đều thất bại. Hãy bật "Password" grant trong Auth0 Dashboard. (${lastError})`,
    };
  }

  /**
   * Export all users via Management API (paginated)
   */
  async exportUsers(): Promise<any[]> {
    const token = await this.getManagementToken();
    const allUsers: any[] = [];
    let page = 0;
    const perPage = 100;

    while (true) {
      const response = await axios.get(
        `https://${this.domain}/api/v2/users`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            page,
            per_page: perPage,
            include_totals: true,
            search_engine: 'v3',
            q: `identities.connection:"${this.connection}"`,
          },
        },
      );

      const { users, total } = response.data;
      allUsers.push(...users);

      if (allUsers.length >= total) break;
      page++;
    }

    this.logger.log(`Exported ${allUsers.length} users from Auth0`);
    return allUsers;
  }
}
