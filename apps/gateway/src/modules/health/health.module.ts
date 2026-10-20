import { Module } from '@nestjs/common';
import { RedisModule } from '@common';
import { HealthController } from '@/modules/health/health.controller';
import { AuthModule } from '@/modules/auth/auth.module';
import { UsersModule } from '@/modules/users/users.module';

@Module({
   imports: [RedisModule, AuthModule, UsersModule],
   controllers: [HealthController],
})
export class HealthModule {}
