import { Global, Module } from '@nestjs/common';
import { CommonConfigModule } from '@common/config/common-config.module';
import { RbacCacheService } from '@common/redis/rbac-cache.service';
import { RedisService } from '@common/redis/redis.service';

@Global()
@Module({
   imports: [CommonConfigModule],
   providers: [RedisService, RbacCacheService],
   exports: [RedisService, RbacCacheService],
})
export class RedisModule {}
