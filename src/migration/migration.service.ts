import { Injectable, Logger } from '@nestjs/common';
import { Auth0Service } from '../auth0/auth0.service';
import { KeycloakService } from '../keycloak/keycloak.service';

export interface MigrationRecord {
  email: string;
  auth0_user_id: string;
  keycloak_user_id: string;
  password_migrated: boolean;
  migrated_at?: string;
}

@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);
  // In-memory store for migration status tracking
  private migrationRecords: Map<string, MigrationRecord> = new Map();

  constructor(
    private readonly auth0Service: Auth0Service,
    private readonly keycloakService: KeycloakService,
  ) {}

  /**
   * Export users from Auth0
   */
  async exportFromAuth0(): Promise<any[]> {
    return this.auth0Service.exportUsers();
  }

  /**
   * Import exported users into Keycloak (without passwords)
   */
  async importToKeycloak(users: any[]) {
    const result = await this.keycloakService.importUsers(users);

    // Track migration records
    for (const detail of result.details) {
      if (detail.success) {
        const user = users.find((u) => u.email === detail.email);
        this.migrationRecords.set(detail.email, {
          email: detail.email,
          auth0_user_id: user?.user_id || '',
          keycloak_user_id: detail.userId || '',
          password_migrated: false,
        });
      }
    }

    return result;
  }

  /**
   * Migrate password: login with Auth0 → if success → set password in Keycloak
   */
  async migratePassword(
    email: string,
    password: string,
  ): Promise<{ success: boolean; message: string }> {
    // Step 1: Verify credentials with Auth0
    this.logger.log(`Attempting password migration for: ${email}`);
    const loginResult = await this.auth0Service.loginUser(email, password);

    if (!loginResult.success) {
      return {
        success: false,
        message: `Auth0 authentication failed: ${loginResult.error}`,
      };
    }

    // Step 2: Find user in Keycloak
    const keycloakUser = await this.keycloakService.findUserByEmail(email);
    if (!keycloakUser) {
      return {
        success: false,
        message: `User ${email} not found in Keycloak. Please import users first.`,
      };
    }

    // Step 3: Set password in Keycloak
    const passwordResult = await this.keycloakService.setUserPassword(
      keycloakUser.id,
      password,
    );

    if (!passwordResult.success) {
      return {
        success: false,
        message: `Failed to set password in Keycloak: ${passwordResult.error}`,
      };
    }

    // Step 4: Update migration record
    this.migrationRecords.set(email, {
      email,
      auth0_user_id: '',
      keycloak_user_id: keycloakUser.id,
      password_migrated: true,
      migrated_at: new Date().toISOString(),
    });

    this.logger.log(`Password migrated successfully for: ${email}`);
    return {
      success: true,
      message: `Password migrated successfully for ${email}`,
    };
  }

  /**
   * Get migration status for all tracked users
   */
  getMigrationStatus(): MigrationRecord[] {
    return Array.from(this.migrationRecords.values());
  }
}
