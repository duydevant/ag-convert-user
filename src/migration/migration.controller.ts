import {
  Controller,
  Get,
  Post,
  Body,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { MigrationService } from './migration.service';
import { LoginDto, ImportUsersDto } from '../dto/auth.dto';
import { Auth0Guard } from '../auth/auth0.guard';

@ApiTags('Migration')
@ApiBearerAuth('Auth0Token')
@UseGuards(Auth0Guard)
@Controller('api/migration')
export class MigrationController {
  constructor(private readonly migrationService: MigrationService) {}

  /**
   * Export all users from Auth0
   */
  @Get('export')
  @ApiBearerAuth('Auth0Token')
  @ApiOperation({
    summary: 'Export users từ Auth0',
    description:
      'Lấy tất cả users từ Auth0 Management API (không bao gồm password)',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách users đã export',
    schema: {
      example: {
        success: true,
        total: 3,
        users: [
          {
            user_id: 'auth0|abc123',
            email: 'user@example.com',
            name: 'User Name',
            email_verified: true,
            created_at: '2026-03-30T10:00:00.000Z',
            last_login: '2026-03-31T08:00:00.000Z',
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 503, description: 'Auth0 Management API chưa được cấu hình' })
  async exportUsers() {
    try {
      const users = await this.migrationService.exportFromAuth0();
      return {
        success: true,
        total: users.length,
        users: users.map((u) => ({
          user_id: u.user_id,
          email: u.email,
          name: u.name,
          email_verified: u.email_verified,
          created_at: u.created_at,
          last_login: u.last_login,
        })),
      };
    } catch (error: any) {
      const message =
        error.message ||
        error.response?.data?.message ||
        'Export failed';

      const isConfigError =
        message.includes('Management API token failed') ||
        message.includes('unauthorized_client') ||
        message.includes('M2M');

      throw new HttpException(
        {
          success: false,
          message,
          hint: isConfigError
            ? 'Cần tạo Machine-to-Machine app trong Auth0 Dashboard và cập nhật AUTH0_M2M_CLIENT_ID/AUTH0_M2M_CLIENT_SECRET trong .env'
            : undefined,
        },
        isConfigError
          ? HttpStatus.SERVICE_UNAVAILABLE
          : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Import users into Keycloak (from exported data)
   */
  @Post('import')
  @ApiBearerAuth('Auth0Token')
  @ApiOperation({
    summary: 'Import users vào Keycloak',
    description:
      'Tạo users trong Keycloak từ dữ liệu đã export (không có password). Sau đó dùng endpoint /login để đồng bộ password.',
  })
  @ApiBody({ type: ImportUsersDto })
  @ApiResponse({
    status: 201,
    description: 'Import thành công',
    schema: {
      example: {
        success: true,
        message: 'Import completed',
        imported: 3,
        skipped: 0,
        failed: 0,
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Thiếu users array' })
  async importUsers(@Body() body: ImportUsersDto) {
    try {
      if (!body.users || !Array.isArray(body.users)) {
        throw new HttpException(
          'Users array is required',
          HttpStatus.BAD_REQUEST,
        );
      }
      const result = await this.migrationService.importToKeycloak(body.users);
      return {
        success: true,
        message: `Import completed`,
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

  /**
   * Password migration: Auth0 login → Keycloak password set
   */
  @Post('login')
  @ApiBearerAuth('Auth0Token')
  @ApiOperation({
    summary: 'Migrate password (Auth0 → Keycloak)',
    description:
      'Đăng nhập bằng Auth0 credentials → nếu thành công → set password trong Keycloak cho user tương ứng',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Password migrated thành công',
    schema: {
      example: {
        success: true,
        message: 'Password migrated successfully for user@example.com',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Sai credentials hoặc user chưa import' })
  async migrateLogin(@Body() body: LoginDto) {
    try {
      if (!body.email || !body.password) {
        throw new HttpException(
          'Email and password are required',
          HttpStatus.BAD_REQUEST,
        );
      }
      const result = await this.migrationService.migratePassword(
        body.email,
        body.password,
      );
      if (!result.success) {
        throw new HttpException(
          { success: false, message: result.message },
          HttpStatus.BAD_REQUEST,
        );
      }
      return result;
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get migration status
   */
  @Get('status')
  @ApiOperation({
    summary: 'Xem trạng thái migration',
    description: 'Lấy danh sách user đã/chưa migrate password',
  })
  @ApiResponse({
    status: 200,
    description: 'Trạng thái migration',
    schema: {
      example: {
        success: true,
        total: 3,
        migrated: 1,
        pending: 2,
        records: [
          {
            email: 'user@example.com',
            keycloak_user_id: 'uuid-123',
            password_migrated: true,
            migrated_at: '2026-03-31T09:00:00.000Z',
          },
        ],
      },
    },
  })
  async getStatus() {
    const records = this.migrationService.getMigrationStatus();
    return {
      success: true,
      total: records.length,
      migrated: records.filter((r) => r.password_migrated).length,
      pending: records.filter((r) => !r.password_migrated).length,
      records,
    };
  }
}
