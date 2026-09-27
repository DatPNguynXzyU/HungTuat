import { Inject, Injectable, Optional } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { AUTH_PATTERNS } from '@common/constants/auth.constant';
import { REDIS_KEY_PREFIX, REDIS_TTL } from '@common/constants/redis.constant';
import { RedisService } from '@common/redis/redis.service';
import { SERVICES } from '@common/rmq/rmq.constants';

export interface CachedRoleData {
   id: string;
   code: string;
   name: string;
   description?: string | null;
   permissions: string[];
}

@Injectable()
export class RbacCacheService {
   constructor(
      private readonly redisService: RedisService,
      @Optional()
      @Inject(SERVICES.AUTH_SERVICE)
      private readonly authClient?: ClientProxy,
   ) {}

   async getRole(roleCode: string): Promise<CachedRoleData | null> {
      const key = `${REDIS_KEY_PREFIX.ROLE}${roleCode}`;
      return this.redisService.getJson<CachedRoleData>(key);
   }

   async setRole(
      roleCode: string,
      roleData: CachedRoleData,
      ttlSeconds: number = REDIS_TTL.DEFAULT_ROLE,
   ): Promise<void> {
      const roleKey = `${REDIS_KEY_PREFIX.ROLE}${roleCode}`;
      const permissionsKey = `${REDIS_KEY_PREFIX.ROLE_PERMISSIONS}${roleCode}`;

      await Promise.all([
         this.redisService.setJson(roleKey, roleData, ttlSeconds),
         this.redisService.setJson(permissionsKey, roleData.permissions, ttlSeconds),
      ]);
   }

   async getRolePermissions(roleCode: string): Promise<string[] | null> {
      const permissionsKey = `${REDIS_KEY_PREFIX.ROLE_PERMISSIONS}${roleCode}`;
      const cachedPermissions = await this.redisService.getJson<string[]>(permissionsKey);
      if (cachedPermissions) {
         return cachedPermissions;
      }

      const roleData = await this.getRole(roleCode);
      if (roleData && roleData.permissions) {
         return roleData.permissions;
      }

      // Fallback via Auth Service RPC when Redis cache misses
      if (this.authClient) {
         try {
            const permissions = await firstValueFrom(
               this.authClient
                  .send<string[], { roleCode: string }>({ cmd: AUTH_PATTERNS.GET_ROLE_PERMISSIONS }, { roleCode })
                  .pipe(timeout(5000)),
            );
            return permissions ?? null;
         } catch {
            return null;
         }
      }

      return null;
   }

   async setRolePermissions(
      roleCode: string,
      permissions: string[],
      ttlSeconds: number = REDIS_TTL.ROLE_PERMISSIONS,
   ): Promise<void> {
      const permissionsKey = `${REDIS_KEY_PREFIX.ROLE_PERMISSIONS}${roleCode}`;
      await this.redisService.setJson(permissionsKey, permissions, ttlSeconds);
   }

   async invalidateRole(roleCode: string): Promise<void> {
      const roleKey = `${REDIS_KEY_PREFIX.ROLE}${roleCode}`;
      const permissionsKey = `${REDIS_KEY_PREFIX.ROLE_PERMISSIONS}${roleCode}`;

      await Promise.all([this.redisService.del(roleKey), this.redisService.del(permissionsKey)]);
   }
}
