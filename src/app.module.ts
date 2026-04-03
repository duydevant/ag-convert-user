import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { Auth0Module } from './auth0/auth0.module';
import { AuthModule } from './auth/auth.module';
import { CustomAuthModule } from './custom-auth/custom-auth.module';
import { KeycloakModule } from './keycloak/keycloak.module';
import { MigrationModule } from './migration/migration.module';
import { TokenValidationModule } from './token-validation/token-validation.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      exclude: ['/api{/*path}'],
    }),
    AuthModule,
    Auth0Module,
    CustomAuthModule,
    KeycloakModule,
    MigrationModule,
    TokenValidationModule,
  ],
})
export class AppModule {}
