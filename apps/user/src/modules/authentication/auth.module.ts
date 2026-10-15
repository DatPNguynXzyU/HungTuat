import { Module } from '@nestjs/common';
import { RedisModule, RmqModule } from '@common';
import { PrismaModule } from '@user/core/database/prisma';
import { ProfileModule } from '@user/modules/profile/profile.module';
import { UsernameBloomFilterService } from '@user/services/infrastructure/username-bloom-filter.service';
import { AuthService } from '@user/services/domain/auth.service';
import { AuthController } from '@user/modules/authentication/auth.controller';

@Module({
   imports: [PrismaModule, RedisModule, ProfileModule, RmqModule],
   controllers: [AuthController],
   providers: [UsernameBloomFilterService, AuthService],
   exports: [UsernameBloomFilterService, AuthService],
})
export class AuthenticationModule {}
