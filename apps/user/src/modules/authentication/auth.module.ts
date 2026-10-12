import { Module } from '@nestjs/common';
import { RedisModule } from '@common';
import { PrismaModule } from '@user/core/database/prisma';
import { ProfileModule } from '@user/modules/profile/profile.module';
import { UsernameBloomFilterService } from './services/username-bloom-filter.service';
import { EmailValidatorService } from './services/email-validator.service';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
   imports: [PrismaModule, RedisModule, ProfileModule],
   controllers: [AuthController],
   providers: [UsernameBloomFilterService, EmailValidatorService, AuthService],
   exports: [UsernameBloomFilterService, EmailValidatorService, AuthService],
})
export class AuthenticationModule {}
