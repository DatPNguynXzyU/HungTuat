import { Test, type TestingModule } from '@nestjs/testing';
import { UserProfileProjection } from '@user/cqrs/read/user-profile.projection';
import { RedisService } from '@common';
import { PrismaService } from '@user/core/database/prisma/prisma.service';
import { USER_DOMAIN_EVENTS } from '@user/domain/events';
import { UserRedisKeys, USER_REDIS_TTL } from '@user/constants';
import { UserStatus } from '@user/core/database/entities';

describe('UserProfileProjection', () => {
   let projection: UserProfileProjection;
   let redisService: {
      get: jest.Mock;
      set: jest.Mock;
      del: jest.Mock;
   };
   let prisma: {
      user: {
         findUnique: jest.Mock;
      };
   };

   beforeEach(async () => {
      redisService = {
         get: jest.fn(),
         set: jest.fn(),
         del: jest.fn(),
      };

      prisma = {
         user: {
            findUnique: jest.fn(),
         },
      };

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            UserProfileProjection,
            { provide: RedisService, useValue: redisService },
            { provide: PrismaService, useValue: prisma },
         ],
      }).compile();

      projection = module.get<UserProfileProjection>(UserProfileProjection);
   });

   describe('USER_CREATED', () => {
      it('should cache newly created user profile in Redis', async () => {
         await projection.project({
            eventId: 'e1',
            streamId: 'user-u1',
            eventType: USER_DOMAIN_EVENTS.USER_CREATED,
            version: 1,
            data: {
               userId: 'u1',
               accountId: 'acc1',
               username: 'john',
               displayName: 'John Doe',
            },
            metadata: { timestamp: '2026-01-01' },
            createdAt: new Date(),
         });

         expect(redisService.set).toHaveBeenCalledWith(
            UserRedisKeys.profileProjection('u1'),
            expect.stringContaining('"userId":"u1"'),
            USER_REDIS_TTL.PROFILE_PROJECTION,
         );
      });
   });

   describe('USER_DELETED', () => {
      it('should remove user from Redis projection cache', async () => {
         await projection.project({
            eventId: 'e2',
            streamId: 'user-u1',
            eventType: USER_DOMAIN_EVENTS.USER_DELETED,
            version: 2,
            data: { userId: 'u1' },
            metadata: { timestamp: '2026-01-01' },
            createdAt: new Date(),
         });

         expect(redisService.del).toHaveBeenCalledWith(UserRedisKeys.profileProjection('u1'));
      });
   });

   describe('getProfile', () => {
      it('should return parsed profile from Redis if cached', async () => {
         const cachedData = {
            userId: 'u1',
            accountId: 'acc1',
            username: 'john',
            displayName: 'John Doe',
            avatar: null,
            status: UserStatus.ACTIVE,
            updatedAt: '2026-01-01T00:00:00.000Z',
         };
         redisService.get.mockResolvedValue(JSON.stringify(cachedData));

         const result = await projection.getProfile('u1');

         expect(result).toEqual(cachedData);
         expect(prisma.user.findUnique).not.toHaveBeenCalled();
      });

      it('should hydrate from database if cache miss', async () => {
         redisService.get.mockResolvedValue(null);
         prisma.user.findUnique.mockResolvedValue({
            userId: 'u1',
            accountId: 'acc1',
            username: 'john',
            status: UserStatus.ACTIVE,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            profile: {
               displayName: 'John Doe',
               avatar: 'https://avatar.com/u1.png',
               bio: 'Software engineer',
            },
         });

         const result = await projection.getProfile('u1');

         expect(prisma.user.findUnique).toHaveBeenCalledWith({
            where: { userId: 'u1' },
            include: { profile: true },
         });
         expect(result).not.toBeNull();
         expect(result?.userId).toBe('u1');
         expect(result?.displayName).toBe('John Doe');
         expect(redisService.set).toHaveBeenCalled();
      });
   });
});
