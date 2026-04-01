import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Auth0Service } from './auth0.service';
import { RegisterDto, LoginDto } from '../dto/auth.dto';

@ApiTags('Auth')
@Controller('api/auth')
export class Auth0Controller {
  constructor(private readonly auth0Service: Auth0Service) {}

  @Post('register')
  @ApiOperation({
    summary: 'Đăng ký user trên Auth0',
    description: 'Tạo user mới trong Auth0 database connection',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'Đăng ký thành công' })
  @ApiResponse({ status: 400, description: 'Thiếu email/password' })
  async register(@Body() body: RegisterDto) {
    try {
      if (!body.email || !body.password) {
        throw new HttpException(
          'Email and password are required',
          HttpStatus.BAD_REQUEST,
        );
      }
      const result = await this.auth0Service.registerUser(
        body.email,
        body.password,
        body.name,
      );
      return {
        success: true,
        message: 'User registered successfully on Auth0',
        user: {
          user_id: result.user_id,
          email: result.email,
          name: result.name,
        },
      };
    } catch (error: any) {
      const msg =
        error.response?.data?.message || error.message || 'Registration failed';
      throw new HttpException(
        { success: false, message: msg },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('login')
  @ApiOperation({
    summary: 'Đăng nhập Auth0',
    description:
      'Xác thực user với Auth0 và trả về access_token. Dùng token này để gọi các API migration.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login thành công, trả về access_token',
    schema: {
      example: {
        success: true,
        message: 'Login successful on Auth0',
        access_token: 'eyJhbGciOiJSUzI1NiIs...',
        token_type: 'Bearer',
        expires_in: 86400,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Sai email/password' })
  async login(@Body() body: LoginDto) {
    try {
      if (!body.email || !body.password) {
        throw new HttpException(
          'Email and password are required',
          HttpStatus.BAD_REQUEST,
        );
      }
      const result = await this.auth0Service.loginUser(
        body.email,
        body.password,
      );
      if (!result.success) {
        throw new HttpException(
          { success: false, message: result.error },
          HttpStatus.UNAUTHORIZED,
        );
      }
      return {
        success: true,
        message: 'Login successful on Auth0',
        access_token: result.data.access_token,
        token_type: result.data.token_type || 'Bearer',
        expires_in: result.data.expires_in,
      };
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        { success: false, message: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
