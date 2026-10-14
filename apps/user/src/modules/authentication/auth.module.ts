import { Module } from '@nestjs/common';
import { RedisModule, RmqModule } from '@common';
import { PrismaModule } from '@user/core/database/prisma';
import { ProfileModule } from '@user/modules/profile/profile.module';
import { UsernameBloomFilterService } from '@user/modules/authentication/services/username-bloom-filter.service';
import { EmailValidatorService } from '@user/modules/authentication/services/email-validator.service';
import { AuthService } from '@user/modules/authentication/auth.service';
import { AuthController } from '@user/modules/authentication/auth.controller';

@Module({
   imports: [PrismaModule, RedisModule, ProfileModule, RmqModule],
   controllers: [AuthController],
   providers: [UsernameBloomFilterService, EmailValidatorService, AuthService],
   exports: [UsernameBloomFilterService, EmailValidatorService, AuthService],
})
export class AuthenticationModule {}
