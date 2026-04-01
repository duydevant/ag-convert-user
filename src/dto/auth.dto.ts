import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email đăng ký' })
  email: string;

  @ApiProperty({ example: 'StrongP@ss123', description: 'Mật khẩu' })
  password: string;

  @ApiPropertyOptional({ example: 'Nguyen Van A', description: 'Tên hiển thị' })
  name?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'StrongP@ss123' })
  password: string;
}

export class ImportUsersDto {
  @ApiProperty({
    type: 'array',
    items: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        name: { type: 'string', example: 'Nguyen Van A' },
        email_verified: { type: 'boolean', example: true },
        user_id: { type: 'string', example: 'auth0|abc123' },
      },
    },
    description: 'Danh sách users từ Auth0 export',
  })
  users: any[];
}

export class ImportBcryptUserCredentialDto {
  @ApiProperty({ example: 'password' })
  type: string;

  @ApiPropertyOptional({ example: 'bcrypt' })
  algorithm?: string;

  @ApiProperty({
    example: '$2b$10$YourHashedPasswordHere...',
    description: 'Bcrypt hashed password',
  })
  hashedSaltedValue: string;

  @ApiPropertyOptional({
    example: { hashIterations: '10' },
    description: 'Additional parameters like hashIterations',
  })
  additionalParameters?: { hashIterations?: string };
}

export class ImportBcryptUserDto {
  @ApiProperty({ example: 'nguyen_gia_khien' })
  username: string;

  @ApiProperty({ example: 'khien@example.com' })
  email: string;

  @ApiPropertyOptional({ example: true })
  enabled?: boolean;

  @ApiPropertyOptional({ example: 'Khien' })
  firstName?: string;

  @ApiPropertyOptional({ example: 'Nguyen Gia' })
  lastName?: string;

  @ApiProperty({
    type: [ImportBcryptUserCredentialDto],
    description: 'Bcrypt credential array',
  })
  credentials: ImportBcryptUserCredentialDto[];
}

