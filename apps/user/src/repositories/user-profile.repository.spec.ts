import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@user/prisma';
import { UserProfileRepository } from '@user/repositories/user-profile.repository';
import { UserStatus, Gender } from '@user/entities';

describe('UserProfileRepository', () => {
   let repository: UserProfileRepository;
   let prismaService: {
      user: {
         create: jest.Mock;
         findFirst: jest.Mock;
         findMany: jest.Mock;
         update: jest.Mock;
      };
      userStats: {
         upsert: jest.Mock;
      };
   };

   const sampleUserRecord = {
      userId: 'usr_123',
      accountId: 'acc_123',
      username: 'johndoe',
      status: UserStatus.ACTIVE,
      deletedAt: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
      lastActiveAt: null,
      profile: {
         profileId: 'prf_123',
         userId: 'usr_123',
         displayName: 'John Doe',
         bio: 'Hello world',
         avatar: 'https://example.com/avatar.png',
         coverImage: null,
         website: 'https://example.com',
         location: 'New York',
         dateOfBirth: new Date('1990-01-01T00:00:00Z'),
         gender: Gender.MALE,
         createdAt: new Date('2026-01-01T00:00:00Z'),
         updatedAt: new Date('2026-01-01T00:00:00Z'),
      },
      stats: {
         statsId: 'sts_123',
         userId: 'usr_123',
         followersCount: 10,
         followingCount: 5,
         postsCount: 2,
         recipesCount: 1,
         createdAt: new Date('2026-01-01T00:00:00Z'),
         updatedAt: new Date('2026-01-01T00:00:00Z'),
      },
      settings: {
         settingsId: 'set_123',
         userId: 'usr_123',
         isPrivate: false,
         isVerified: true,
         createdAt: new Date('2026-01-01T00:00:00Z'),
         updatedAt: new Date('2026-01-01T00:00:00Z'),
      },
   };

   beforeEach(async () => {
      prismaService = {
         user: {
            create: jest.fn(),
            findFirst: jest.fn(),
            findMany: jest.fn(),
            update: jest.fn(),
         },
         userStats: {
            upsert: jest.fn(),
         },
      };

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            UserProfileRepository,
            {
               provide: PrismaService,
               useValue: prismaService,
            },
         ],
      }).compile();

      repository = module.get<UserProfileRepository>(UserProfileRepository);
   });

   it('should be defined', () => {
      expect(repository).toBeDefined();
   });

   describe('create', () => {
      it('should create a user with profile, stats, settings and return entity', async () => {
         prismaService.user.create.mockResolvedValue(sampleUserRecord);

         const result = await repository.create({
            accountId: 'acc_123',
            username: 'johndoe',
            displayName: 'John Doe',
         });

         expect(prismaService.user.create).toHaveBeenCalledTimes(1);
         expect(result.userId).toBe('usr_123');
         expect(result.username).toBe('johndoe');
         expect(result.displayName).toBe('John Doe');
         expect(result.isVerified).toBe(true);
      });
   });

   describe('findById', () => {
      it('should find user by id filtering deletedAt null at database level', async () => {
         prismaService.user.findFirst.mockResolvedValue(sampleUserRecord);

         const result = await repository.findById('usr_123');

         expect(prismaService.user.findFirst).toHaveBeenCalledWith({
            where: {
               userId: 'usr_123',
               deletedAt: null,
            },
            include: {
               profile: true,
               stats: true,
               settings: true,
            },
         });
         expect(result).not.toBeNull();
         expect(result?.userId).toBe('usr_123');
      });

      it('should return null when user not found', async () => {
         prismaService.user.findFirst.mockResolvedValue(null);

         const result = await repository.findById('usr_nonexistent');

         expect(result).toBeNull();
      });
   });

   describe('findByAccountId', () => {
      it('should find user by accountId with deletedAt null', async () => {
         prismaService.user.findFirst.mockResolvedValue(sampleUserRecord);

         const result = await repository.findByAccountId('acc_123');

         expect(prismaService.user.findFirst).toHaveBeenCalledWith({
            where: {
               accountId: 'acc_123',
               deletedAt: null,
            },
            include: {
               profile: true,
               stats: true,
               settings: true,
            },
         });
         expect(result?.accountId).toBe('acc_123');
      });
   });

   describe('findByUsername', () => {
      it('should find user by username with deletedAt null', async () => {
         prismaService.user.findFirst.mockResolvedValue(sampleUserRecord);

         const result = await repository.findByUsername('johndoe');

         expect(prismaService.user.findFirst).toHaveBeenCalledWith({
            where: {
               username: 'johndoe',
               deletedAt: null,
            },
            include: {
               profile: true,
               stats: true,
               settings: true,
            },
         });
         expect(result?.username).toBe('johndoe');
      });
   });

   describe('findDateOfBirth', () => {
      it('should return userId and dateOfBirth', async () => {
         prismaService.user.findFirst.mockResolvedValue({
            userId: 'usr_123',
            accountId: 'acc_123',
            profile: { dateOfBirth: new Date('1990-01-01T00:00:00Z') },
         });

         const result = await repository.findDateOfBirth('usr_123');

         expect(result?.userId).toBe('usr_123');
         expect(result?.dateOfBirth).toEqual(new Date('1990-01-01T00:00:00Z'));
      });

      it('should return null when user not found', async () => {
         prismaService.user.findFirst.mockResolvedValue(null);

         const result = await repository.findDateOfBirth('unknown');

         expect(result).toBeNull();
      });
   });

   describe('findAllUsernames', () => {
      it('should return list of non-null usernames', async () => {
         prismaService.user.findMany.mockResolvedValue([{ username: 'user1' }, { username: 'user2' }]);

         const result = await repository.findAllUsernames();

         expect(result).toEqual(['user1', 'user2']);
      });
   });

   describe('findAll', () => {
      it('should return paginated user entities', async () => {
         prismaService.user.findMany.mockResolvedValue([sampleUserRecord]);

         const result = await repository.findAll(0, 10);

         expect(result).toHaveLength(1);
         expect(result[0].userId).toBe('usr_123');
      });
   });

   describe('findByIds', () => {
      it('should return empty array when userIds is empty', async () => {
         const result = await repository.findByIds([]);
         expect(result).toEqual([]);
         expect(prismaService.user.findMany).not.toHaveBeenCalled();
      });

      it('should query by userIds with optional status filter', async () => {
         prismaService.user.findMany.mockResolvedValue([sampleUserRecord]);

         const result = await repository.findByIds(['usr_123'], UserStatus.ACTIVE);

         expect(prismaService.user.findMany).toHaveBeenCalledWith({
            where: {
               userId: { in: ['usr_123'] },
               deletedAt: null,
               status: UserStatus.ACTIVE,
            },
            include: {
               profile: true,
               stats: true,
               settings: true,
            },
         });
         expect(result).toHaveLength(1);
      });
   });

   describe('findTopUsers', () => {
      it('should query top users by followers count excluding specified user IDs', async () => {
         prismaService.user.findMany.mockResolvedValue([sampleUserRecord]);

         const result = await repository.findTopUsers(5, ['usr_excluded']);

         expect(prismaService.user.findMany).toHaveBeenCalledWith({
            where: {
               deletedAt: null,
               status: UserStatus.ACTIVE,
               userId: { notIn: ['usr_excluded'] },
            },
            take: 5,
            orderBy: [{ stats: { followersCount: 'desc' } }, { createdAt: 'desc' }],
            include: {
               profile: true,
               stats: true,
               settings: true,
            },
         });
         expect(result).toHaveLength(1);
      });
   });

   describe('update', () => {
      it('should update user and nested profile/settings and return entity', async () => {
         prismaService.user.update.mockResolvedValue({
            ...sampleUserRecord,
            username: 'newusername',
         });

         const result = await repository.update('usr_123', {
            username: 'newusername',
            displayName: 'New Name',
         });

         expect(prismaService.user.update).toHaveBeenCalledTimes(1);
         expect(result.username).toBe('newusername');
      });
   });

   describe('softDelete and restore', () => {
      it('should set deletedAt date on softDelete', async () => {
         prismaService.user.update.mockResolvedValue({
            ...sampleUserRecord,
            deletedAt: new Date(),
         });

         const result = await repository.softDelete('usr_123');

         expect(prismaService.user.update).toHaveBeenCalledWith(
            expect.objectContaining({
               where: { userId: 'usr_123' },
               data: expect.objectContaining({ deletedAt: expect.any(Date) }),
            }),
         );
         expect(result.deletedAt).toBeDefined();
      });

      it('should set deletedAt null on restore', async () => {
         prismaService.user.update.mockResolvedValue({
            ...sampleUserRecord,
            deletedAt: null,
         });

         const result = await repository.restore('usr_123');

         expect(prismaService.user.update).toHaveBeenCalledWith(
            expect.objectContaining({
               where: { userId: 'usr_123' },
               data: { deletedAt: null },
            }),
         );
         expect(result.deletedAt).toBeNull();
      });
   });

   describe('stats increments and decrements', () => {
      it('should upsert follower count increment', async () => {
         prismaService.userStats.upsert.mockResolvedValue({});

         await repository.incrementFollowersCount('usr_123');

         expect(prismaService.userStats.upsert).toHaveBeenCalledWith({
            where: { userId: 'usr_123' },
            update: { followersCount: { increment: 1 } },
            create: { userId: 'usr_123', followersCount: 1 },
         });
      });

      it('should upsert following count decrement', async () => {
         prismaService.userStats.upsert.mockResolvedValue({});

         await repository.decrementFollowingCount('usr_123');

         expect(prismaService.userStats.upsert).toHaveBeenCalledWith({
            where: { userId: 'usr_123' },
            update: { followingCount: { decrement: 1 } },
            create: { userId: 'usr_123', followingCount: 0 },
         });
      });
   });
});
