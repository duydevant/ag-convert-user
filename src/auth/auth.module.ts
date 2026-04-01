import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { Auth0Guard } from './auth0.guard';

@Module({
  imports: [PassportModule, ConfigModule],
  providers: [JwtStrategy, Auth0Guard],
  exports: [Auth0Guard],
})
export class AuthModule {}
