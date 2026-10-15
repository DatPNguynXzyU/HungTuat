import { Test, type TestingModule } from '@nestjs/testing';
import { UserStatsProjection } from '@user/cqrs/read/user-stats.projection';
import { PrismaService } from '@user/core/database/prisma/prisma.service';
import { USER_DOMAIN_EVENTS } from '@user/domain/events';
import { FollowStatus } from '@user/core/database/entities';

describe('UserStatsProjection', () => {
   let projection: UserStatsProjection;
   let prisma: {
      userStats: {
         upsert: jest.Mock;
         updateMany: jest.Mock;
         findUnique: jest.Mock;
      };
      $transaction: jest.Mock;
   };

   beforeEach(async () => {
      prisma = {
         userStats: {
            upsert: jest.fn(),
            updateMany: jest.fn(),
            findUnique: jest.fn(),
         },
         $transaction: jest.fn().mockImplementation(async (fns: Promise<unknown>[]) => Promise.all(fns)),
      };

      const module: TestingModule = await Test.createTestingModule({
         providers: [UserStatsProjection, { provide: PrismaService, useValue: prisma }],
      }).compile();

      projection = module.get<UserStatsProjection>(UserStatsProjection);
   });

   describe('USER_CREATED', () => {
      it('should initialize user stats row', async () => {
         await projection.project({
            eventId: 'e1',
            streamId: 'user-u1',
            eventType: USER_DOMAIN_EVENTS.USER_CREATED,
            version: 1,
            data: { userId: 'u1' },
            metadata: { timestamp: '2026-01-01' },
            createdAt: new Date(),
         });

         expect(prisma.userStats.upsert).toHaveBeenCalledWith({
            where: { userId: 'u1' },
            update: {},
            create: {
               userId: 'u1',
               followersCount: 0,
               followingCount: 0,
               postsCount: 0,
               recipesCount: 0,
            },
         });
      });
   });

   describe('USER_FOLLOWED', () => {
      it('should increment follower followingCount and following followersCount when ACCEPTED', async () => {
         await projection.project({
            eventId: 'e2',
            streamId: 'follow-u1-u2',
            eventType: USER_DOMAIN_EVENTS.USER_FOLLOWED,
            version: 1,
            data: {
               followerId: 'u1',
               followingId: 'u2',
               status: FollowStatus.ACCEPTED,
            },
            metadata: { timestamp: '2026-01-01' },
            createdAt: new Date(),
         });

         expect(prisma.$transaction).toHaveBeenCalled();
         expect(prisma.userStats.upsert).toHaveBeenCalledWith({
            where: { userId: 'u1' },
            update: { followingCount: { increment: 1 } },
            create: { userId: 'u1', followingCount: 1, followersCount: 0 },
         });
         expect(prisma.userStats.upsert).toHaveBeenCalledWith({
            where: { userId: 'u2' },
            update: { followersCount: { increment: 1 } },
            create: { userId: 'u2', followersCount: 1, followingCount: 0 },
         });
      });

      it('should ignore non-ACCEPTED follow events', async () => {
         await projection.project({
            eventId: 'e3',
            streamId: 'follow-u1-u2',
            eventType: USER_DOMAIN_EVENTS.USER_FOLLOWED,
            version: 1,
            data: {
               followerId: 'u1',
               followingId: 'u2',
               status: FollowStatus.PENDING,
            },
            metadata: { timestamp: '2026-01-01' },
            createdAt: new Date(),
         });

         expect(prisma.$transaction).not.toHaveBeenCalled();
      });
   });

   describe('USER_UNFOLLOWED', () => {
      it('should decrement followingCount and followersCount', async () => {
         await projection.project({
            eventId: 'e4',
            streamId: 'follow-u1-u2',
            eventType: USER_DOMAIN_EVENTS.USER_UNFOLLOWED,
            version: 2,
            data: {
               followerId: 'u1',
               followingId: 'u2',
            },
            metadata: { timestamp: '2026-01-01' },
            createdAt: new Date(),
         });

         expect(prisma.$transaction).toHaveBeenCalled();
         expect(prisma.userStats.updateMany).toHaveBeenCalledWith({
            where: { userId: 'u1', followingCount: { gt: 0 } },
            data: { followingCount: { decrement: 1 } },
         });
         expect(prisma.userStats.updateMany).toHaveBeenCalledWith({
            where: { userId: 'u2', followersCount: { gt: 0 } },
            data: { followersCount: { decrement: 1 } },
         });
      });
   });

   describe('getUserStats', () => {
      it('should return null when stats record not found', async () => {
         prisma.userStats.findUnique.mockResolvedValue(null);

         const result = await projection.getUserStats('u-unknown');

         expect(result).toBeNull();
      });

      it('should return mapped stats result', async () => {
         const mockDate = new Date();
         prisma.userStats.findUnique.mockResolvedValue({
            userId: 'u1',
            followersCount: 10,
            followingCount: 5,
            postsCount: 2,
            recipesCount: 1,
            updatedAt: mockDate,
         });

         const result = await projection.getUserStats('u1');

         expect(result).toEqual({
            userId: 'u1',
            followersCount: 10,
            followingCount: 5,
            postsCount: 2,
            recipesCount: 1,
            updatedAt: mockDate,
         });
      });
   });
});
