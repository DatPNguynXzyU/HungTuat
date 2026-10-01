import { Module } from '@nestjs/common';
import { BloomFilterService } from '@common/redis/bloom-filter.service';
import { RbacCacheService } from '@common/redis/rbac-cache.service';
import { RedisService } from '@common/redis/redis.service';

@Module({
   providers: [RedisService, RbacCacheService, BloomFilterService],
   exports: [RedisService, RbacCacheService, BloomFilterService],
})
export class RedisModule {}
