import { Module } from '@nestjs/common';
import { MigrationController } from './migration.controller';
import { MigrationService } from './migration.service';
import { Auth0Module } from '../auth0/auth0.module';
import { KeycloakModule } from '../keycloak/keycloak.module';

@Module({
  imports: [Auth0Module, KeycloakModule],
  controllers: [MigrationController],
  providers: [MigrationService],
})
export class MigrationModule {}
