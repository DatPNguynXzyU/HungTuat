import { Module } from '@nestjs/common';
import { RedisModule } from '@common';
import { HealthController } from '@/modules/health/health.controller';

@Module({
   imports: [RedisModule],
   controllers: [HealthController],
})
export class HealthModule {}
