import { Test, TestingModule } from '@nestjs/testing';
import { AppLogger, RetryQueueService } from '@common';
import { UserEntity } from '@user/core/database/entities';
import { GRAPH_FOLLOW_REPOSITORY, type IFollowGraphRepository } from '@user/modules/follow/repositories';
import { UserGraphSyncService } from '@user/services/infrastructure/user-graph-sync.service';

describe('UserGraphSyncService (Infrastructure)', () => {
   let service: UserGraphSyncService;
   let graphRepo: jest.Mocked<Partial<IFollowGraphRepository>>;
   let logger: jest.Mocked<Partial<AppLogger>>;
   let retryQueue: jest.Mocked<Partial<RetryQueueService>>;

   beforeEach(async () => {
      graphRepo = {
         createOrUpdateUser: jest.fn().mockResolvedValue(undefined),
         createFollow: jest.fn().mockResolvedValue(undefined),
         deleteFollow: jest.fn().mockResolvedValue(undefined),
      };

      logger = {
         log: jest.fn(),
         error: jest.fn(),
         warn: jest.fn(),
         setContext: jest.fn(),
      };

      retryQueue = {
         processJobs: jest.fn().mockResolvedValue(1),
      };

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            UserGraphSyncService,
            {
               provide: GRAPH_FOLLOW_REPOSITORY,
               useValue: graphRepo,
            },
            {
               provide: AppLogger,
               useValue: logger,
            },
            {
               provide: RetryQueueService,
               useValue: retryQueue,
            },
         ],
      }).compile();

      service = module.get<UserGraphSyncService>(UserGraphSyncService);
   });

   it('should be defined', () => {
      expect(service).toBeDefined();
   });

   it('should sync user to graph', async () => {
      const user = new UserEntity({
         userId: 'u1',
         username: 'john',
         displayName: 'John',
         createdAt: new Date(),
         updatedAt: new Date(),
      });

      await service.syncUserToGraph(user);

      expect(graphRepo.createOrUpdateUser).toHaveBeenCalledWith(
         expect.objectContaining({
            userId: 'u1',
            username: 'john',
         }),
      );
   });

   it('should sync follow relationship', async () => {
      await service.syncFollowRelationship('u1', 'u2');

      expect(graphRepo.createFollow).toHaveBeenCalledWith('u1', 'u2');
   });

   it('should sync unfollow relationship', async () => {
      await service.syncUnfollowRelationship('u1', 'u2');

      expect(graphRepo.deleteFollow).toHaveBeenCalledWith('u1', 'u2');
   });

   it('should process sync retries', async () => {
      const result = await service.processSyncRetries();

      expect(retryQueue.processJobs).toHaveBeenCalledTimes(3);
      expect(result.processed).toBe(3);
   });
});
