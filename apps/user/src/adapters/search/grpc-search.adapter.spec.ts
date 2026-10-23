import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import type { ClientGrpc, ClientProxy } from '@nestjs/microservices';
import { SERVICES } from '@common';
import { SEARCH_V1_GRPC_CLIENT, SEARCH_V1_GRPC_SERVICE_NAME } from '@contracts/search';
import { GrpcSearchAdapter } from './grpc-search.adapter';

describe('GrpcSearchAdapter', () => {
   let adapter: GrpcSearchAdapter;
   let searchClient: jest.Mocked<Partial<ClientProxy>>;
   let mockSearchGrpcService: { searchUsers: jest.Mock };
   let grpcClient: jest.Mocked<Partial<ClientGrpc>>;

   beforeEach(async () => {
      searchClient = {
         emit: jest.fn(),
      };

      mockSearchGrpcService = {
         searchUsers: jest.fn(),
      };

      grpcClient = {
         getService: jest.fn().mockReturnValue(mockSearchGrpcService),
      };

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            GrpcSearchAdapter,
            {
               provide: SERVICES.SEARCH_SERVICE,
               useValue: searchClient,
            },
            {
               provide: SEARCH_V1_GRPC_CLIENT,
               useValue: grpcClient,
            },
         ],
      }).compile();

      adapter = module.get<GrpcSearchAdapter>(GrpcSearchAdapter);
      adapter.onModuleInit();
   });

   it('should be defined and initialize gRPC service', () => {
      expect(adapter).toBeDefined();
      expect(grpcClient.getService).toHaveBeenCalledWith(SEARCH_V1_GRPC_SERVICE_NAME);
   });

   it('should search users via gRPC and normalize returned protobuf result', async () => {
      const mockGrpcRes = {
         items: [
            {
               userId: 'usr_uuid_12345678_0001',
               documentId: 'usr_uuid_12345678_0001',
               username: 'john_doe',
               displayName: 'John Doe',
               avatar: 'https://cdn.example.com/avatars/john.jpg',
               bio: 'Software Engineer',
               isVerified: true,
               followersCount: 10,
               followingCount: 5,
               createdAt: '2026-01-01T00:00:00.000Z',
               updatedAt: '2026-01-02T00:00:00.000Z',
            },
         ],
         nextCursor: 'next_token',
         hasMore: true,
         total: 1,
      };

      mockSearchGrpcService.searchUsers.mockReturnValue(of(mockGrpcRes));

      const result = await adapter.searchUsers('john_doe', 10, 'cursor_token_abc');

      expect(result.items).toHaveLength(1);
      expect(result.items[0].userId).toBe('usr_uuid_12345678_0001');
      expect(result.items[0].documentId).toBe('usr_uuid_12345678_0001');
      expect(result.items[0].username).toBe('john_doe');
      expect(result.nextCursor).toBe('next_token');
      expect(result.hasMore).toBe(true);
      expect(mockSearchGrpcService.searchUsers).toHaveBeenCalledWith({
         query: 'john_doe',
         limit: 10,
         cursor: 'cursor_token_abc',
      });
   });

   it('should catch error and return fallback empty result if search service throws', async () => {
      mockSearchGrpcService.searchUsers.mockReturnValue(throwError(() => new Error('gRPC connection failed')));

      const res = await adapter.searchUsers('john');

      expect(res).toEqual({ items: [], nextCursor: null, hasMore: false, total: 0 });
   });

   it('should emit index event via RabbitMQ', () => {
      adapter.emitIndexEvent('user.created', { userId: 'usr_uuid_12345678_0001' });
      expect(searchClient.emit).toHaveBeenCalledWith('user.created', { userId: 'usr_uuid_12345678_0001' });
   });
});
