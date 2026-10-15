import { Test, type TestingModule } from '@nestjs/testing';
import { UserActivityProjection } from '@user/cqrs/read/user-activity.projection';
import { PrismaService } from '@user/core/database/prisma/prisma.service';
import { USER_DOMAIN_EVENTS } from '@user/domain/events';
import { uuidv7 } from '@common';

describe('UserActivityProjection', () => {
   let projection: UserActivityProjection;
   let prisma: {
      userActivitySummary: {
         upsert: jest.Mock;
         findUnique: jest.Mock;
         deleteMany: jest.Mock;
      };
   };

   beforeEach(async () => {
      prisma = {
         userActivitySummary: {
            upsert: jest.fn(),
            findUnique: jest.fn(),
            deleteMany: jest.fn(),
         },
      };

      const module: TestingModule = await Test.createTestingModule({
         providers: [UserActivityProjection, { provide: PrismaService, useValue: prisma }],
      }).compile();

      projection = module.get<UserActivityProjection>(UserActivityProjection);
   });

   describe('project', () => {
      it('should record user updated activity count', async () => {
         const now = new Date();
         const userId = uuidv7();
         await projection.project({
            eventId: uuidv7(),
            streamId: `user-${userId}`,
            eventType: USER_DOMAIN_EVENTS.USER_UPDATED,
            version: 1,
            data: { userId },
            metadata: { timestamp: now.toISOString() },
            createdAt: now,
         });

         expect(prisma.userActivitySummary.upsert).toHaveBeenCalledWith({
            where: { userId },
            update: expect.objectContaining({
               totalEvents: { increment: 1 },
               profileUpdatesCount: { increment: 1 },
               lastEventType: USER_DOMAIN_EVENTS.USER_UPDATED,
            }),
            create: expect.objectContaining({
               userId,
               totalEvents: 1,
               profileUpdatesCount: 1,
            }),
         });
      });

      it('should record follow action count when user followed', async () => {
         const now = new Date();
         const followerId = uuidv7();
         const followingId = uuidv7();
         await projection.project({
            eventId: uuidv7(),
            streamId: `follow-${followerId}-${followingId}`,
            eventType: USER_DOMAIN_EVENTS.USER_FOLLOWED,
            version: 1,
            data: { followerId, followingId },
            metadata: { timestamp: now.toISOString() },
            createdAt: now,
         });

         expect(prisma.userActivitySummary.upsert).toHaveBeenCalledWith({
            where: { userId: followerId },
            update: expect.objectContaining({
               totalEvents: { increment: 1 },
               followActionsCount: { increment: 1 },
               lastEventType: USER_DOMAIN_EVENTS.USER_FOLLOWED,
            }),
            create: expect.objectContaining({
               userId: followerId,
               totalEvents: 1,
               followActionsCount: 1,
            }),
         });
      });

      it('should ignore events with invalid UUIDv7 IDs', async () => {
         await projection.project({
            eventId: 'invalid-id',
            streamId: 'unknown',
            eventType: USER_DOMAIN_EVENTS.USER_UPDATED,
            version: 1,
            data: { userId: 'not-a-uuid' },
            metadata: { timestamp: new Date().toISOString() },
            createdAt: new Date(),
         });

         expect(prisma.userActivitySummary.upsert).not.toHaveBeenCalled();
      });
   });

   describe('getActivitySummary', () => {
      it('should retrieve activity summary from Prisma', async () => {
         const mockSummary = {
            userId: 'u1',
            totalEvents: 10,
            lastEventType: USER_DOMAIN_EVENTS.USER_UPDATED,
            lastEventAt: new Date(),
            profileUpdatesCount: 5,
            followActionsCount: 5,
            updatedAt: new Date(),
         };
         prisma.userActivitySummary.findUnique.mockResolvedValue(mockSummary);

         const result = await projection.getActivitySummary('u1');

         expect(prisma.userActivitySummary.findUnique).toHaveBeenCalledWith({
            where: { userId: 'u1' },
         });
         expect(result).toEqual(mockSummary);
      });
   });
});
