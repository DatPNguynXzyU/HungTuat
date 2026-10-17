import { Module } from '@nestjs/common';
import { CommonConfigModule } from '@common/config/common-config.module';
import { CacheService } from '@common/cache/cache.service';
import { RedisModule } from '@common/redis/redis.module';

@Module({
   imports: [CommonConfigModule, RedisModule],
   providers: [CacheService],
   exports: [CacheService],
})
export class CacheModule {}
