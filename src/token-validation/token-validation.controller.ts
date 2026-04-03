import {
  Controller,
  Post,
  Body,
  Headers,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiHeader } from '@nestjs/swagger';
import { TokenValidationService } from './token-validation.service';

@ApiTags('Token Validation')
@Controller('api/token')
export class TokenValidationController {
  constructor(
    private readonly tokenValidationService: TokenValidationService,
  ) {}

  /**
   * POST /api/token/validate
   * Validate a Keycloak access token from ANY client in the realm.
   * Token can be sent via:
   *   - Request body: { "token": "eyJ..." }
   *   - Authorization header: "Bearer eyJ..."
   */
  @Post('validate')
  @ApiOperation({
    summary: 'Validate Keycloak Access Token',
    description:
      'Xác thực JWT access token từ BẤT KỲ client nào trong Keycloak realm. ' +
      'Sử dụng JWKS public key — không cần client_secret. ' +
      'Token có thể gửi qua body hoặc Authorization header.',
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token (optional — có thể gửi qua body thay thế)',
    required: false,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
          description: 'JWT access token (optional nếu đã gửi qua Authorization header)',
          example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Token validation result',
    schema: {
      example: {
        valid: true,
        decoded: {
          sub: 'bb155fe7-89f5-44b7-bcd0-62e53b5b7c75',
          email: 'user@example.com',
          preferred_username: 'user@example.com',
          name: 'Duy Vu',
          realm_access: { roles: ['default-roles-ag-ecommerce'] },
          azp: 'ag-frontend',
        },
        tokenInfo: {
          issuer: 'http://localhost:9016/realms/ag-ecommerce',
          clientId: 'ag-frontend',
          expiresAt: '2026-04-03T10:30:00.000Z',
          issuedAt: '2026-04-03T10:25:00.000Z',
          remainingSeconds: 280,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Token invalid',
    schema: {
      example: {
        valid: false,
        error: 'Token expired at 2026-04-03T09:00:00.000Z',
      },
    },
  })
  async validateToken(
    @Body() body: { token?: string },
    @Headers('authorization') authHeader?: string,
  ) {
    // Prioritize body token, fallback to Authorization header
    const token = body?.token || authHeader || '';

    if (!token) {
      throw new HttpException(
        {
          valid: false,
          error: 'No token provided. Send token in body { "token": "..." } or Authorization header.',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.tokenValidationService.validateToken(token);
  }
}
