import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TokenValidationService } from './token-validation.service';
import { TokenValidationController } from './token-validation.controller';

@Module({
  imports: [ConfigModule],
  controllers: [TokenValidationController],
  providers: [TokenValidationService],
  exports: [TokenValidationService],
})
export class TokenValidationModule {}
