import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { CustomAuthService } from './custom-auth.service';
import { LoginDto } from '../dto/auth.dto';

@ApiTags('Custom Auth')
@Controller('api/custom-auth')
export class CustomAuthController {
  constructor(private readonly customAuthService: CustomAuthService) {}

  @Post('login')
  @ApiOperation({
    summary: 'Proxy Login (Auth0 → Keycloak Migration)',
    description:
      'Gửi email + password → hệ thống xác thực qua Auth0 → nếu đúng → tự động migrate password sang Keycloak → trả về access_token + refresh_token từ CẢ Auth0 và Keycloak.\n\n' +
      '**Flow:**\n' +
      '1. Xác thực credentials với Auth0\n' +
      '2. Tìm hoặc tạo user trong Keycloak\n' +
      '3. Migrate password sang Keycloak\n' +
      '4. Login vào Keycloak\n' +
      '5. Trả về tokens từ cả 2 hệ thống',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login + migration thành công',
    schema: {
      example: {
        success: true,
        message: 'Login successful. Password migrated to Keycloak for user@example.com',
        password_migrated: true,
        auth0: {
          access_token: 'eyJhbGciOiJSUzI1NiIs...',
          token_type: 'Bearer',
          expires_in: 86400,
        },
        keycloak: {
          access_token: 'eyJhbGciOiJSUzI1NiIs...',
          refresh_token: 'eyJhbGciOiJIUzI1NiIs...',
          token_type: 'Bearer',
          expires_in: 300,
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Auth0 credentials sai' })
  @ApiResponse({ status: 400, description: 'Thiếu email/password' })
  async proxyLogin(@Body() body: LoginDto) {
    if (!body.email || !body.password) {
      throw new HttpException(
        { success: false, message: 'Email and password are required' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const result = await this.customAuthService.proxyLogin(
      body.email,
      body.password,
    );

    if (!result.success) {
      throw new HttpException(
        { success: false, message: result.message },
        result.message.includes('Auth0 authentication failed')
          ? HttpStatus.UNAUTHORIZED
          : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return result;
  }
}
