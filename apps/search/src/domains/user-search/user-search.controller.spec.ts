import { Test, TestingModule } from '@nestjs/testing';
import { RmqContext } from '@nestjs/microservices';
import { AppLogger, QUEUES, RmqService } from '@common';
import { BULK_OPERATIONS, SEARCH_INDICES } from '@contracts/search';
import { UserSearchController } from '@search/domains/user-search/user-search.controller';
import { UserSearchService } from '@search/domains/user-search/user-search.service';
import { BulkIndexQueue } from '@search/core/queue';

describe('UserSearchController', () => {
   let controller: UserSearchController;

   const mockUserSearchService = {
      searchUsers: jest.fn(),
   };

   const mockBulkQueue = {
      addOperation: jest.fn(),
      addOperations: jest.fn(),
   };

   const mockRmqService = {
      ack: jest.fn(),
      nack: jest.fn(),
      handleError: jest.fn(),
   };

   const mockLogger = {
      setContext: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
   };

   const mockContext = {} as RmqContext;

   beforeEach(async () => {
      jest.clearAllMocks();
      mockBulkQueue.addOperation.mockResolvedValue(undefined);
      mockUserSearchService.searchUsers.mockResolvedValue({ items: [], nextCursor: null, hasMore: false, total: 0 });

      const module: TestingModule = await Test.createTestingModule({
         controllers: [UserSearchController],
         providers: [
            {
               provide: UserSearchService,
               useValue: mockUserSearchService,
            },
            {
               provide: BulkIndexQueue,
               useValue: mockBulkQueue,
            },
            {
               provide: RmqService,
               useValue: mockRmqService,
            },
            {
               provide: AppLogger,
               useValue: mockLogger,
            },
         ],
      }).compile();

      controller = module.get<UserSearchController>(UserSearchController);
   });

   it('should be defined', () => {
      expect(controller).toBeDefined();
   });

   describe('handleUserCreated', () => {
      it('should add index operation to queue and ack context', async () => {
         const data = { userId: 'u-1', username: 'john' };
         await controller.handleUserCreated(data, mockContext);

         expect(mockBulkQueue.addOperation).toHaveBeenCalledWith(
            expect.objectContaining({
               operation: BULK_OPERATIONS.INDEX,
               index: SEARCH_INDICES.USERS,
               documentId: 'u-1',
            }),
         );
         expect(mockRmqService.ack).toHaveBeenCalledWith(mockContext);
      });

      it('should delegate to rmqService.handleError and not ack on queue error', async () => {
         const queueError = new Error('Queue full');
         mockBulkQueue.addOperation.mockRejectedValue(queueError);

         await controller.handleUserCreated({ userId: 'u-1' }, mockContext);

         expect(mockRmqService.handleError).toHaveBeenCalledWith(
            queueError,
            mockContext,
            expect.objectContaining({ queue: QUEUES.SEARCH }),
         );
         expect(mockRmqService.ack).not.toHaveBeenCalled();
      });
   });

   describe('handleUserUpdated', () => {
      it('should add update operation to queue and ack context', async () => {
         const data = { userId: 'u-1', username: 'john_new' };
         await controller.handleUserUpdated(data, mockContext);

         expect(mockBulkQueue.addOperation).toHaveBeenCalledWith(
            expect.objectContaining({
               operation: BULK_OPERATIONS.UPDATE,
               index: SEARCH_INDICES.USERS,
               documentId: 'u-1',
            }),
         );
         expect(mockRmqService.ack).toHaveBeenCalledWith(mockContext);
      });
   });

   describe('handleUserDeleted', () => {
      it('should add delete operation to queue and ack context', async () => {
         await controller.handleUserDeleted({ userId: 'u-1' }, mockContext);

         expect(mockBulkQueue.addOperation).toHaveBeenCalledWith({
            operation: BULK_OPERATIONS.DELETE,
            index: SEARCH_INDICES.USERS,
            documentId: 'u-1',
         });
         expect(mockRmqService.ack).toHaveBeenCalledWith(mockContext);
      });
   });

   describe('handleUserSync', () => {
      it('should queue index operation for sync event and ack context', async () => {
         const data = { userId: 'u-1', username: 'john_sync' };
         await controller.handleUserSync(data, mockContext);

         expect(mockBulkQueue.addOperation).toHaveBeenCalledWith(
            expect.objectContaining({
               operation: BULK_OPERATIONS.INDEX,
               index: SEARCH_INDICES.USERS,
               documentId: 'u-1',
            }),
         );
         expect(mockRmqService.ack).toHaveBeenCalledWith(mockContext);
      });
   });

   describe('searchUsersViaSearchPattern', () => {
      it('should delegate search to userSearchService and ack context', async () => {
         const mockRes = { items: [], nextCursor: null, hasMore: false, total: 0 };
         mockUserSearchService.searchUsers.mockResolvedValue(mockRes);

         const result = await controller.searchUsersViaSearchPattern({ query: 'john', limit: 10 }, mockContext);

         expect(mockUserSearchService.searchUsers).toHaveBeenCalledWith('john', 10, undefined);
         expect(mockRmqService.ack).toHaveBeenCalledWith(mockContext);
         expect(result).toEqual(mockRes);
      });
   });

   describe('searchUsersViaUserPattern', () => {
      it('should delegate search to userSearchService and ack context', async () => {
         const mockRes = { items: [], nextCursor: null, hasMore: false, total: 0 };
         mockUserSearchService.searchUsers.mockResolvedValue(mockRes);

         const result = await controller.searchUsersViaUserPattern({ query: 'john', limit: 10 }, mockContext);

         expect(mockUserSearchService.searchUsers).toHaveBeenCalledWith('john', 10, undefined);
         expect(mockRmqService.ack).toHaveBeenCalledWith(mockContext);
         expect(result).toEqual(mockRes);
      });
   });
});
