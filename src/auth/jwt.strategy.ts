import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'auth0-jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(configService: ConfigService) {
    const domain = configService.get<string>('AUTH0_DOMAIN')!;
    const audience = configService.get<string>('AUTH0_AUDIENCE')!;

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://${domain}/.well-known/jwks.json`,
      }),
      audience,
      issuer: `https://${domain}/`,
      algorithms: ['RS256'],
    });

    this.logger.log(`JWT Strategy configured — issuer: https://${domain}/`);
  }

  validate(payload: any) {
    // payload contains decoded JWT claims
    return {
      sub: payload.sub,
      email: payload.email,
      scope: payload.scope,
    };
  }
}
