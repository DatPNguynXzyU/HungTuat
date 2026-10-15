import { Injectable } from '@nestjs/common';
import { PrismaService } from '@user/core/database/prisma/prisma.service';
import { USER_STATS_PROJECTION } from '@user/cqrs/constants/user-cqrs.constant';
import type { UserStoredEvent } from '@user/cqrs/write/user-event.interface';
import { USER_DOMAIN_EVENTS } from '@user/domain/events';
import { FollowStatus } from '@user/core/database/entities';
import { AbstractUserProjection } from '@user/cqrs/read/abstract-user.projection';

export interface UserStatsResult {
   userId: string;
   followersCount: number;
   followingCount: number;
   postsCount: number;
   recipesCount: number;
   updatedAt: Date;
}

@Injectable()
export class UserStatsProjection extends AbstractUserProjection {
   constructor(private readonly prisma: PrismaService) {
      super();
   }

   protected getProjectionName(): string {
      return USER_STATS_PROJECTION;
   }

   /**
    * Projects a domain event into the UserStats read model.
    * Can be executed synchronously during event replay or asynchronously on event arrival.
    */
   async project(event: UserStoredEvent): Promise<void> {
      const { eventType, data } = event;

      switch (eventType) {
         case USER_DOMAIN_EVENTS.USER_CREATED: {
            const payload = data as { userId?: string };
            if (payload.userId) {
               await this.prisma.userStats.upsert({
                  where: { userId: payload.userId },
                  update: {},
                  create: {
                     userId: payload.userId,
                     followersCount: 0,
                     followingCount: 0,
                     postsCount: 0,
                     recipesCount: 0,
                  },
               });
            }
            break;
         }

         case USER_DOMAIN_EVENTS.USER_FOLLOWED: {
            const payload = data as {
               followerId?: string;
               followingId?: string;
               status?: FollowStatus;
            };

            if (payload.followerId && payload.followingId && payload.status === FollowStatus.ACCEPTED) {
               await this.incrementStats(payload.followerId, payload.followingId);
            }
            break;
         }

         case USER_DOMAIN_EVENTS.FOLLOW_REQUEST_ACCEPTED: {
            const payload = data as {
               followerId?: string;
               followingId?: string;
            };

            if (payload.followerId && payload.followingId) {
               await this.incrementStats(payload.followerId, payload.followingId);
            }
            break;
         }

         case USER_DOMAIN_EVENTS.USER_UNFOLLOWED: {
            const payload = data as {
               followerId?: string;
               followingId?: string;
            };

            if (payload.followerId && payload.followingId) {
               await this.decrementStats(payload.followerId, payload.followingId);
            }
            break;
         }

         default:
            // Other events do not affect user stats
            break;
      }
   }

   private async incrementStats(followerId: string, followingId: string): Promise<void> {
      await this.prisma.$transaction([
         this.prisma.userStats.upsert({
            where: { userId: followerId },
            update: { followingCount: { increment: 1 } },
            create: { userId: followerId, followingCount: 1, followersCount: 0 },
         }),
         this.prisma.userStats.upsert({
            where: { userId: followingId },
            update: { followersCount: { increment: 1 } },
            create: { userId: followingId, followersCount: 1, followingCount: 0 },
         }),
      ]);
   }

   private async decrementStats(followerId: string, followingId: string): Promise<void> {
      await this.prisma.$transaction([
         this.prisma.userStats.updateMany({
            where: { userId: followerId, followingCount: { gt: 0 } },
            data: { followingCount: { decrement: 1 } },
         }),
         this.prisma.userStats.updateMany({
            where: { userId: followingId, followersCount: { gt: 0 } },
            data: { followersCount: { decrement: 1 } },
         }),
      ]);
   }

   /**
    * Query side: Retrieves user statistics from the read-optimized projection.
    */
   async getUserStats(userId: string): Promise<UserStatsResult | null> {
      const stats = await this.prisma.userStats.findUnique({
         where: { userId },
      });

      if (!stats) {
         return null;
      }

      return {
         userId: stats.userId,
         followersCount: stats.followersCount,
         followingCount: stats.followingCount,
         postsCount: stats.postsCount,
         recipesCount: stats.recipesCount,
         updatedAt: stats.updatedAt,
      };
   }

   /**
    * Replay support: resets all stats prior to a complete projection rebuild.
    */
   async resetAll(): Promise<void> {
      await this.prisma.userStats.updateMany({
         data: {
            followersCount: 0,
            followingCount: 0,
            postsCount: 0,
            recipesCount: 0,
         },
      });
   }
}
