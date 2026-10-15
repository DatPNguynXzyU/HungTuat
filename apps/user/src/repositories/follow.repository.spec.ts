import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@user/prisma';
import { FollowRepository } from '@user/repositories/follow.repository';
import { FollowStatus } from '@user/entities';

describe('FollowRepository', () => {
   let repository: FollowRepository;
   let prismaService: {
      follow: {
         create: jest.Mock;
         findFirst: jest.Mock;
         findMany: jest.Mock;
         count: jest.Mock;
         update: jest.Mock;
         delete: jest.Mock;
      };
   };

   const sampleFollowRecord = {
      followId: 'flw_123',
      followerId: 'usr_1',
      followingId: 'usr_2',
      status: FollowStatus.ACCEPTED,
      deletedAt: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
   };

   beforeEach(async () => {
      prismaService = {
         follow: {
            create: jest.fn(),
            findFirst: jest.fn(),
            findMany: jest.fn(),
            count: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
         },
      };

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            FollowRepository,
            {
               provide: PrismaService,
               useValue: prismaService,
            },
         ],
      }).compile();

      repository = module.get<FollowRepository>(FollowRepository);
   });

   it('should be defined', () => {
      expect(repository).toBeDefined();
   });

   describe('create', () => {
      it('should create follow record with generated followId and return entity', async () => {
         prismaService.follow.create.mockResolvedValue(sampleFollowRecord);

         const result = await repository.create({
            followerId: 'usr_1',
            followingId: 'usr_2',
            status: FollowStatus.ACCEPTED,
         });

         expect(prismaService.follow.create).toHaveBeenCalledWith(
            expect.objectContaining({
               data: expect.objectContaining({
                  follower: { connect: { userId: 'usr_1' } },
                  following: { connect: { userId: 'usr_2' } },
                  status: FollowStatus.ACCEPTED,
                  followId: expect.any(String),
               }),
            }),
         );
         expect(result.followId).toBe('flw_123');
      });

      it('should throw BadRequestException if followerId or followingId missing', async () => {
         await expect(repository.create({ followerId: 'u1' })).rejects.toThrow();
         await expect(repository.create({ followingId: 'u2' })).rejects.toThrow();
      });
   });

   describe('findById', () => {
      it('should find follow record with deletedAt null', async () => {
         prismaService.follow.findFirst.mockResolvedValue(sampleFollowRecord);

         const result = await repository.findById('flw_123');

         expect(prismaService.follow.findFirst).toHaveBeenCalledWith({
            where: {
               followId: 'flw_123',
               deletedAt: null,
            },
         });
         expect(result?.followId).toBe('flw_123');
      });

      it('should return null when not found', async () => {
         prismaService.follow.findFirst.mockResolvedValue(null);

         const result = await repository.findById('flw_unknown');

         expect(result).toBeNull();
      });
   });

   describe('findByFollowerAndFollowing', () => {
      it('should query by followerId and followingId with deletedAt null', async () => {
         prismaService.follow.findFirst.mockResolvedValue(sampleFollowRecord);

         const result = await repository.findByFollowerAndFollowing('usr_1', 'usr_2');

         expect(prismaService.follow.findFirst).toHaveBeenCalledWith({
            where: {
               followerId: 'usr_1',
               followingId: 'usr_2',
               deletedAt: null,
            },
         });
         expect(result?.followId).toBe('flw_123');
      });
   });

   describe('findAllActive', () => {
      it('should return all active follow entities', async () => {
         prismaService.follow.findMany.mockResolvedValue([sampleFollowRecord]);

         const result = await repository.findAllActive();

         expect(prismaService.follow.findMany).toHaveBeenCalledWith({
            where: { deletedAt: null },
         });
         expect(result).toHaveLength(1);
      });
   });

   describe('findFollowRelations', () => {
      it('should return empty sets if inputs are empty', async () => {
         const result = await repository.findFollowRelations('', []);
         expect(result.followingSet.size).toBe(0);
         expect(result.followerSet.size).toBe(0);
         expect(prismaService.follow.findMany).not.toHaveBeenCalled();
      });

      it('should query bidirectional relations and partition into sets', async () => {
         prismaService.follow.findMany.mockResolvedValue([
            { followerId: 'usr_current', followingId: 'usr_target_1' },
            { followerId: 'usr_target_2', followingId: 'usr_current' },
         ]);

         const result = await repository.findFollowRelations('usr_current', ['usr_target_1', 'usr_target_2']);

         expect(result.followingSet.has('usr_target_1')).toBe(true);
         expect(result.followerSet.has('usr_target_2')).toBe(true);
      });
   });

   describe('findFollowers and findFollowing', () => {
      it('should query followers with pagination', async () => {
         prismaService.follow.findMany.mockResolvedValue([sampleFollowRecord]);

         const result = await repository.findFollowers('usr_2', FollowStatus.ACCEPTED, 0, 10);

         expect(prismaService.follow.findMany).toHaveBeenCalledWith({
            where: {
               followingId: 'usr_2',
               deletedAt: null,
               status: FollowStatus.ACCEPTED,
            },
            skip: 0,
            take: 10,
            orderBy: { createdAt: 'desc' },
         });
         expect(result).toHaveLength(1);
      });

      it('should query following with pagination', async () => {
         prismaService.follow.findMany.mockResolvedValue([sampleFollowRecord]);

         const result = await repository.findFollowing('usr_1', FollowStatus.ACCEPTED, 0, 10);

         expect(prismaService.follow.findMany).toHaveBeenCalledWith({
            where: {
               followerId: 'usr_1',
               deletedAt: null,
               status: FollowStatus.ACCEPTED,
            },
            skip: 0,
            take: 10,
            orderBy: { createdAt: 'desc' },
         });
         expect(result).toHaveLength(1);
      });
   });

   describe('counts', () => {
      it('should count followers', async () => {
         prismaService.follow.count.mockResolvedValue(42);

         const count = await repository.countFollowers('usr_2', FollowStatus.ACCEPTED);

         expect(count).toBe(42);
      });

      it('should count following', async () => {
         prismaService.follow.count.mockResolvedValue(15);

         const count = await repository.countFollowing('usr_1', FollowStatus.ACCEPTED);

         expect(count).toBe(15);
      });
   });

   describe('updateStatus, softDelete, and restore', () => {
      it('should update status', async () => {
         prismaService.follow.update.mockResolvedValue({
            ...sampleFollowRecord,
            status: FollowStatus.REJECTED,
         });

         const result = await repository.updateStatus('flw_123', FollowStatus.REJECTED);

         expect(result.status).toBe(FollowStatus.REJECTED);
      });

      it('should soft delete', async () => {
         prismaService.follow.update.mockResolvedValue({
            ...sampleFollowRecord,
            deletedAt: new Date(),
         });

         const result = await repository.softDelete('flw_123');

         expect(result.deletedAt).toBeDefined();
      });

      it('should soft delete by follower and following', async () => {
         prismaService.follow.findFirst.mockResolvedValue(sampleFollowRecord);
         prismaService.follow.update.mockResolvedValue({
            ...sampleFollowRecord,
            deletedAt: new Date(),
         });

         const result = await repository.softDeleteByFollowerAndFollowing('usr_1', 'usr_2');

         expect(result).not.toBeNull();
      });

      it('should return null when soft delete target does not exist', async () => {
         prismaService.follow.findFirst.mockResolvedValue(null);

         const result = await repository.softDeleteByFollowerAndFollowing('usr_none', 'usr_none2');

         expect(result).toBeNull();
      });

      it('should restore follow', async () => {
         prismaService.follow.update.mockResolvedValue({
            ...sampleFollowRecord,
            deletedAt: null,
         });

         const result = await repository.restore('flw_123');

         expect(result.deletedAt).toBeNull();
      });
   });

   describe('delete', () => {
      it('should hard delete follow record', async () => {
         prismaService.follow.delete.mockResolvedValue(sampleFollowRecord);

         const result = await repository.delete('flw_123');

         expect(prismaService.follow.delete).toHaveBeenCalledWith({
            where: { followId: 'flw_123' },
         });
         expect(result.followId).toBe('flw_123');
      });

      it('should hard delete by follower and following', async () => {
         prismaService.follow.findFirst.mockResolvedValue(sampleFollowRecord);
         prismaService.follow.delete.mockResolvedValue(sampleFollowRecord);

         const result = await repository.deleteByFollowerAndFollowing('usr_1', 'usr_2');

         expect(result?.followId).toBe('flw_123');
      });
   });
});
