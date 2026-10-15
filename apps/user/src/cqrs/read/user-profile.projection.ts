import { Injectable } from '@nestjs/common';
import { RedisService } from '@common';
import { PrismaService } from '@user/prisma/prisma.service';
import { USER_PROFILE_PROJECTION } from '@user/cqrs/constants/user-cqrs.constant';
import type { UserStoredEvent } from '@user/cqrs/write/user-event.interface';
import { USER_DOMAIN_EVENTS } from '@user/domain/events';
import { UserRedisKeys, USER_REDIS_TTL } from '@user/constants';
import { UserStatus } from '@user/entities';
import { AbstractUserProjection } from '@user/cqrs/read/abstract-user.projection';

export interface UserProfileProjectionData {
   userId: string;
   accountId: string;
   username: string | null;
   displayName: string | null;
   avatar: string | null;
   status: UserStatus;
   bio?: string | null;
   updatedAt: string;
}

@Injectable()
export class UserProfileProjection extends AbstractUserProjection {
   constructor(
      private readonly redisService: RedisService,
      private readonly prisma: PrismaService,
   ) {
      super();
   }

   protected getProjectionName(): string {
      return USER_PROFILE_PROJECTION;
   }

   /**
    * Projects user lifecycle events into the fast denormalized Redis read model.
    */
   async project(event: UserStoredEvent): Promise<void> {
      const { eventType, data } = event;

      switch (eventType) {
         case USER_DOMAIN_EVENTS.USER_CREATED: {
            const payload = data as {
               userId?: string;
               accountId?: string;
               username?: string | null;
               displayName?: string | null;
               status?: UserStatus;
            };

            if (payload.userId && payload.accountId) {
               const projection: UserProfileProjectionData = {
                  userId: payload.userId,
                  accountId: payload.accountId,
                  username: payload.username ?? null,
                  displayName: payload.displayName ?? null,
                  avatar: null,
                  status: payload.status ?? UserStatus.ACTIVE,
                  bio: null,
                  updatedAt: new Date().toISOString(),
               };

               await this.redisService.set(
                  UserRedisKeys.profileProjection(payload.userId),
                  JSON.stringify(projection),
                  USER_REDIS_TTL.PROFILE_PROJECTION,
               );
            }
            break;
         }

         case USER_DOMAIN_EVENTS.USER_UPDATED: {
            const payload = data as {
               userId?: string;
               changes?: Record<string, unknown>;
            };

            if (payload.userId) {
               await this.patchProfileCache(payload.userId, payload.changes ?? {});
            }
            break;
         }

         case USER_DOMAIN_EVENTS.USERNAME_CHANGED: {
            const payload = data as {
               userId?: string;
               newUsername?: string;
            };

            if (payload.userId && payload.newUsername) {
               await this.patchProfileCache(payload.userId, { username: payload.newUsername });
            }
            break;
         }

         case USER_DOMAIN_EVENTS.AVATAR_UPLOADED: {
            const payload = data as {
               userId?: string;
               avatarUrl?: string;
            };

            if (payload.userId && payload.avatarUrl) {
               await this.patchProfileCache(payload.userId, { avatar: payload.avatarUrl });
            }
            break;
         }

         case USER_DOMAIN_EVENTS.USER_DELETED: {
            const payload = data as { userId?: string };
            if (payload.userId) {
               await this.redisService.del(UserRedisKeys.profileProjection(payload.userId));
            }
            break;
         }

         case USER_DOMAIN_EVENTS.USER_RESTORED: {
            const payload = data as { userId?: string };
            if (payload.userId) {
               await this.hydrateFromDatabase(payload.userId);
            }
            break;
         }

         default:
            // Non-profile events
            break;
      }
   }

   private async patchProfileCache(userId: string, changes: Record<string, unknown>): Promise<void> {
      const key = UserRedisKeys.profileProjection(userId);
      const cached = await this.redisService.get(key);

      let current: UserProfileProjectionData;
      if (cached) {
         try {
            current = JSON.parse(cached) as UserProfileProjectionData;
         } catch {
            const hydrated = await this.hydrateFromDatabase(userId);
            if (!hydrated) return;
            current = hydrated;
         }
      } else {
         const hydrated = await this.hydrateFromDatabase(userId);
         if (!hydrated) return;
         current = hydrated;
      }

      const updated: UserProfileProjectionData = {
         ...current,
         ...changes,
         updatedAt: new Date().toISOString(),
      };

      await this.redisService.set(key, JSON.stringify(updated), USER_REDIS_TTL.PROFILE_PROJECTION);
   }

   /**
    * Hydrates read model from PostgreSQL when not found in Redis.
    */
   async hydrateFromDatabase(userId: string): Promise<UserProfileProjectionData | null> {
      const user = await this.prisma.user.findUnique({
         where: { userId },
         include: { profile: true },
      });

      if (!user) {
         return null;
      }

      const projection: UserProfileProjectionData = {
         userId: user.userId,
         accountId: user.accountId,
         username: user.username,
         displayName: user.profile?.displayName ?? null,
         avatar: user.profile?.avatar ?? null,
         status: user.status,
         bio: user.profile?.bio ?? null,
         updatedAt: user.updatedAt.toISOString(),
      };

      await this.redisService.set(
         UserRedisKeys.profileProjection(userId),
         JSON.stringify(projection),
         USER_REDIS_TTL.PROFILE_PROJECTION,
      );

      return projection;
   }

   /**
    * Query side: Retrieves fast denormalized user profile read model.
    */
   async getProfile(userId: string): Promise<UserProfileProjectionData | null> {
      const cached = await this.redisService.get(UserRedisKeys.profileProjection(userId));
      if (cached) {
         try {
            return JSON.parse(cached) as UserProfileProjectionData;
         } catch {
            // Fall through to database hydration
         }
      }

      return this.hydrateFromDatabase(userId);
   }
}
