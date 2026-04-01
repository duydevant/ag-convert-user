import { Module } from '@nestjs/common';
import { Auth0Module } from '../auth0/auth0.module';
import { KeycloakModule } from '../keycloak/keycloak.module';
import { CustomAuthService } from './custom-auth.service';
import { CustomAuthController } from './custom-auth.controller';

@Module({
  imports: [Auth0Module, KeycloakModule],
  providers: [CustomAuthService],
  controllers: [CustomAuthController],
})
export class CustomAuthModule {}
