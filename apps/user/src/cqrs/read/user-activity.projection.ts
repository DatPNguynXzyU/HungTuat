import { Injectable } from '@nestjs/common';
import { isUuidV7 } from '@common';
import { PrismaService } from '@user/prisma/prisma.service';
import { USER_ACTIVITY_PROJECTION } from '@user/cqrs/constants/user-cqrs.constant';
import type { UserStoredEvent } from '@user/cqrs/write/user-event.interface';
import { USER_DOMAIN_EVENTS } from '@user/domain/events';
import { AbstractUserProjection } from '@user/cqrs/read/abstract-user.projection';

export interface UserActivitySummaryResult {
   userId: string;
   totalEvents: number;
   lastEventType: string | null;
   lastEventAt: Date | null;
   profileUpdatesCount: number;
   followActionsCount: number;
   updatedAt: Date;
}

@Injectable()
export class UserActivityProjection extends AbstractUserProjection {
   constructor(private readonly prisma: PrismaService) {
      super();
   }

   protected getProjectionName(): string {
      return USER_ACTIVITY_PROJECTION;
   }

   /**
    * Projects user lifecycle and interaction events into UserActivitySummary read model.
    */
   async project(event: UserStoredEvent): Promise<void> {
      const { eventType, data, createdAt } = event;
      const payload = data;

      const rawUserId = payload.userId ?? payload.followerId;
      if (!isUuidV7(rawUserId)) {
         return;
      }
      const userId = rawUserId;

      const isProfileUpdate =
         eventType === USER_DOMAIN_EVENTS.USER_UPDATED ||
         eventType === USER_DOMAIN_EVENTS.USERNAME_CHANGED ||
         eventType === USER_DOMAIN_EVENTS.AVATAR_UPLOADED;

      const isFollowAction =
         eventType === USER_DOMAIN_EVENTS.USER_FOLLOWED ||
         eventType === USER_DOMAIN_EVENTS.USER_UNFOLLOWED ||
         eventType === USER_DOMAIN_EVENTS.FOLLOW_REQUEST_ACCEPTED ||
         eventType === USER_DOMAIN_EVENTS.FOLLOW_REQUEST_REJECTED;

      await this.prisma.userActivitySummary.upsert({
         where: { userId },
         update: {
            totalEvents: { increment: 1 },
            lastEventType: eventType,
            lastEventAt: createdAt,
            ...(isProfileUpdate ? { profileUpdatesCount: { increment: 1 } } : {}),
            ...(isFollowAction ? { followActionsCount: { increment: 1 } } : {}),
         },
         create: {
            userId,
            totalEvents: 1,
            lastEventType: eventType,
            lastEventAt: createdAt,
            profileUpdatesCount: isProfileUpdate ? 1 : 0,
            followActionsCount: isFollowAction ? 1 : 0,
         },
      });
   }

   /**
    * Query side: Retrieves user activity summary from the read model.
    */
   async getActivitySummary(userId: string): Promise<UserActivitySummaryResult | null> {
      return this.prisma.userActivitySummary.findUnique({
         where: { userId },
      });
   }

   /**
    * Replay support: cleans all activity summaries before full rebuild.
    */
   async resetAll(): Promise<void> {
      await this.prisma.userActivitySummary.deleteMany();
   }
}
