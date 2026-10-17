import { Module } from '@nestjs/common';
import { CacheService } from '@common/cache/cache.service';
import { BloomFilterService } from '@common/redis/bloom-filter.service';
import { RbacCacheService } from '@common/redis/rbac-cache.service';
import { RedisService } from '@common/redis/redis.service';

@Module({
   providers: [RedisService, CacheService, RbacCacheService, BloomFilterService],
   exports: [RedisService, CacheService, RbacCacheService, BloomFilterService],
})
export class RedisModule {}
