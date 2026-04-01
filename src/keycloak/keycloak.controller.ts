import {
  Controller,
  Post,
  Body,
  Get,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { KeycloakService } from './keycloak.service';
import { ImportBcryptUserDto } from '../dto/auth.dto';

@ApiTags('Keycloak')
@Controller('api')
export class KeycloakController {
  constructor(private readonly keycloakService: KeycloakService) {}

  /**
   * GET /api/config — expose Keycloak connection params to frontend
   */
  @Get('config')
  getConfig() {
    return this.keycloakService.getConfig();
  }

  /**
   * POST /api/auth/keycloak/callback
   * Exchange authorization code for tokens (Authorization Code + PKCE flow)
   */
  @Post('auth/keycloak/callback')
  async keycloakCallback(
    @Body() body: { code: string; redirectUri: string; codeVerifier?: string },
  ) {
    if (!body.code || !body.redirectUri) {
      throw new HttpException(
        { success: false, message: 'code and redirectUri are required' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const result = await this.keycloakService.exchangeCodeForTokens(
      body.code,
      body.redirectUri,
      body.codeVerifier,
    );

    if (!result.success) {
      throw new HttpException(
        { success: false, message: result.error || 'Token exchange failed' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    return result;
  }

  /**
   * POST /api/keycloak/import-bcrypt-users
   * Import users with pre-hashed bcrypt passwords into Keycloak.
   * Requires keycloak-bcrypt provider to be installed in Keycloak.
   *
   * NOTE: Authentication guard is commented out for now.
   * Uncomment @UseGuards(Auth0Guard) and @ApiBearerAuth('Auth0Token') when ready.
   */
  // @UseGuards(Auth0Guard)
  // @ApiBearerAuth('Auth0Token')
  @Post('keycloak/import-bcrypt-users')
  @ApiOperation({
    summary: 'Import users với mật khẩu đã hash bcrypt',
    description:
      'Tạo users trong Keycloak với mật khẩu đã được hash bcrypt (từ Node.js hoặc hệ thống khác). ' +
      'Yêu cầu keycloak-bcrypt provider đã được cài đặt trên Keycloak server.',
  })
  @ApiBody({
    type: [ImportBcryptUserDto],
    description: 'Array of users with bcrypt credentials',
    examples: {
      example1: {
        summary: 'Import 1 user với bcrypt hash',
        value: [
          {
            username: 'nguyen_gia_khien',
            email: 'khien@example.com',
            enabled: true,
            firstName: 'Khien',
            lastName: 'Nguyen Gia',
            credentials: [
              {
                type: 'password',
                algorithm: 'bcrypt',
                hashedSaltedValue:
                  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
                additionalParameters: {
                  hashIterations: '10',
                },
              },
            ],
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Import thành công',
    schema: {
      example: {
        success: true,
        message: 'Import completed: 1 imported, 0 failed',
        imported: 1,
        skipped: 0,
        failed: 0,
        details: [
          {
            username: 'nguyen_gia_khien',
            email: 'khien@example.com',
            success: true,
            userId: 'uuid-here',
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  async importBcryptUsers(@Body() body: ImportBcryptUserDto[]) {
    try {
      if (!Array.isArray(body) || body.length === 0) {
        throw new HttpException(
          {
            success: false,
            message:
              'Request body must be a non-empty array of users with bcrypt credentials',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const result =
        await this.keycloakService.importUsersWithBcryptHash(body);

      return {
        success: true,
        message: `Import completed: ${result.imported} imported, ${result.failed} failed`,
        ...result,
      };
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          success: false,
          message: error.response?.data?.message || error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
