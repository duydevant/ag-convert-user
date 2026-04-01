import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class Auth0Guard extends AuthGuard('auth0-jwt') {
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      throw new UnauthorizedException({
        success: false,
        message: 'Access token không hợp lệ hoặc đã hết hạn. Hãy login tại /api/auth/login để lấy token.',
        error: info?.message || 'Unauthorized',
      });
    }
    return user;
  }
}
