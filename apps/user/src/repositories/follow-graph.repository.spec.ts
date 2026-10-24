import { Test, TestingModule } from '@nestjs/testing';
import { AppLogger } from '@common';
import { NebulaService } from '@user/infrastructure/nebula';
import { FollowGraphRepository } from '@user/repositories/follow-graph.repository';
import { FollowStatus } from '@user/entities';

describe('FollowGraphRepository', () => {
   let repository: FollowGraphRepository;
   let nebulaService: {
      execute: jest.Mock;
   };
   let logger: {
      debug: jest.Mock;
      error: jest.Mock;
      setContext: jest.Mock;
   };

   beforeEach(async () => {
      nebulaService = {
         execute: jest.fn(),
      };
      logger = {
         debug: jest.fn(),
         error: jest.fn(),
         setContext: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            FollowGraphRepository,
            {
               provide: NebulaService,
               useValue: nebulaService,
            },
            {
               provide: AppLogger,
               useValue: logger,
            },
         ],
      }).compile();

      repository = module.get<FollowGraphRepository>(FollowGraphRepository);
   });

   it('should be defined', () => {
      expect(repository).toBeDefined();
   });

   describe('createOrUpdateUser', () => {
      it('should execute INSERT VERTEX query to nebula', async () => {
         nebulaService.execute.mockResolvedValue({});

         await repository.createOrUpdateUser({
            userId: 'usr_1',
            username: 'alex',
            displayName: 'Alex Doe',
            isPrivate: false,
         });

         expect(nebulaService.execute).toHaveBeenCalledWith(expect.stringContaining('INSERT VERTEX User'));
         expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('usr_1'));
      });

      it('should rethrow error and log error if nebula fails', async () => {
         nebulaService.execute.mockRejectedValue(new Error('Nebula connection error'));

         await expect(
            repository.createOrUpdateUser({
               userId: 'usr_1',
            }),
         ).rejects.toThrow('Nebula connection error');
         expect(logger.error).toHaveBeenCalled();
      });
   });

   describe('createFollow', () => {
      it('should execute INSERT EDGE Follow query', async () => {
         nebulaService.execute.mockResolvedValue({});

         await repository.createFollow('usr_1', 'usr_2');

         expect(nebulaService.execute).toHaveBeenCalledWith(expect.stringContaining('INSERT EDGE Follow'));
      });
   });

   describe('updateFollowStatus', () => {
      it('should execute INSERT EDGE Follow query', async () => {
         nebulaService.execute.mockResolvedValue({});

         await repository.updateFollowStatus('usr_1', 'usr_2', FollowStatus.ACCEPTED);

         expect(nebulaService.execute).toHaveBeenCalledWith(expect.stringContaining('INSERT EDGE Follow'));
      });
   });

   describe('deleteFollow', () => {
      it('should execute DELETE EDGE Follow query', async () => {
         nebulaService.execute.mockResolvedValue({});

         await repository.deleteFollow('usr_1', 'usr_2');

         expect(nebulaService.execute).toHaveBeenCalledWith(expect.stringContaining('DELETE EDGE Follow'));
      });
   });

   describe('findFollow', () => {
      it('should return true when edge exists', async () => {
         nebulaService.execute.mockResolvedValue({ data: [{ 'Follow.createdAt': 123456789 }] });

         const result = await repository.findFollow('usr_1', 'usr_2');

         expect(result).toBe(true);
      });

      it('should return false when edge does not exist or query fails', async () => {
         nebulaService.execute.mockRejectedValue(new Error('Edge not found'));

         const result = await repository.findFollow('usr_1', 'usr_unknown');

         expect(result).toBe(false);
      });
   });

   describe('getFollowers', () => {
      it('should query reverse follow edges and return mapped items', async () => {
         nebulaService.execute.mockResolvedValue({
            data: [{ followerId: 'usr_1', createdAt: 1600000000000 }],
         });

         const result = await repository.getFollowers('usr_2', FollowStatus.ACCEPTED, 0, 10);

         expect(result).toHaveLength(1);
         expect(result[0].followerId).toBe('usr_1');
         expect(result[0].followingId).toBe('usr_2');
         expect(result[0].status).toBe(FollowStatus.ACCEPTED);
      });

      it('should return empty array on failure', async () => {
         nebulaService.execute.mockRejectedValue(new Error('Query failed'));

         const result = await repository.getFollowers('usr_2');

         expect(result).toEqual([]);
      });
   });

   describe('getFollowing', () => {
      it('should query outgoing follow edges and return mapped items', async () => {
         nebulaService.execute.mockResolvedValue({
            data: [{ followingId: 'usr_2', createdAt: 1600000000000 }],
         });

         const result = await repository.getFollowing('usr_1', FollowStatus.ACCEPTED, 0, 10);

         expect(result).toHaveLength(1);
         expect(result[0].followerId).toBe('usr_1');
         expect(result[0].followingId).toBe('usr_2');
      });
   });

   describe('counts', () => {
      it('should return count for followers', async () => {
         nebulaService.execute.mockResolvedValue({ data: [{ count: 25 }] });

         const count = await repository.countFollowers('usr_2');

         expect(count).toBe(25);
      });

      it('should return count for following', async () => {
         nebulaService.execute.mockResolvedValue({ data: [{ count: 12 }] });

         const count = await repository.countFollowing('usr_1');

         expect(count).toBe(12);
      });

      it('should return 0 on count failure', async () => {
         nebulaService.execute.mockRejectedValue(new Error('Query error'));

         const count = await repository.countFollowers('usr_fail');

         expect(count).toBe(0);
      });
   });

   describe('getMutualFollowers', () => {
      it('should return intersection of followers', async () => {
         nebulaService.execute.mockResolvedValue({
            data: [{ follower1: 'usr_mutual_1' }, { follower1: 'usr_mutual_2' }],
         });

         const result = await repository.getMutualFollowers('usr_1', 'usr_2');

         expect(result).toEqual(['usr_mutual_1', 'usr_mutual_2']);
      });
   });

   describe('getFollowSuggestions', () => {
      it('should return 2-step friend-of-friend suggestions excluding the requesting user', async () => {
         nebulaService.execute.mockResolvedValue({
            data: [{ suggestedUserId: 'usr_suggested_1' }, { suggestedUserId: 'usr_me' }],
         });

         const result = await repository.getFollowSuggestions('usr_me', 5);

         expect(result).toEqual(['usr_suggested_1']);
      });
   });
});
