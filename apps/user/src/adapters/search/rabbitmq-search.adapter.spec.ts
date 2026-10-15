import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { ClientProxy } from '@nestjs/microservices';
import { SERVICES } from '@common';
import { SEARCH_PATTERNS } from '@contracts/search';
import { RabbitMqSearchAdapter } from '@user/adapters/search/rabbitmq-search.adapter';

describe('RabbitMqSearchAdapter', () => {
   let adapter: RabbitMqSearchAdapter;
   let searchClient: jest.Mocked<Partial<ClientProxy>>;

   beforeEach(async () => {
      searchClient = {
         send: jest.fn(),
         emit: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            RabbitMqSearchAdapter,
            {
               provide: SERVICES.SEARCH_SERVICE,
               useValue: searchClient,
            },
         ],
      }).compile();

      adapter = module.get<RabbitMqSearchAdapter>(RabbitMqSearchAdapter);
   });

   it('should be defined', () => {
      expect(adapter).toBeDefined();
   });

   it('should search users and normalize returned Elasticsearch document into explicit userId and documentId', async () => {
      // Clear demonstration: Elasticsearch document maps to documentId and userId
      const mockUserSearchResultFromElasticsearch = {
         items: [
            {
               documentId: 'doc_user_uuid_12345678_0001',
               userId: 'usr_uuid_12345678_0001',
               username: 'john_doe',
               displayName: 'John Doe',
               avatar: 'https://cdn.example.com/avatars/john.jpg',
               bio: 'Software Engineer',
            },
         ],
         nextCursor: null,
         hasMore: false,
         total: 1,
      };
      (searchClient.send as jest.Mock).mockReturnValue(of(mockUserSearchResultFromElasticsearch));

      const result = await adapter.searchUsers('john_doe', 10, 'cursor_token_abc');

      expect(result.items).toHaveLength(1);
      expect(result.items[0].userId).toBe('usr_uuid_12345678_0001');
      expect(result.items[0].documentId).toBe('doc_user_uuid_12345678_0001');
      expect(result.items[0].username).toBe('john_doe');
      expect(searchClient.send).toHaveBeenCalledWith(
         { cmd: SEARCH_PATTERNS.SEARCH_USERS },
         { query: 'john_doe', limit: 10, cursor: 'cursor_token_abc' },
      );
   });

   it('should catch error and return fallback empty result if search service throws', async () => {
      (searchClient.send as jest.Mock).mockReturnValue(throwError(() => new Error('Connection failed')));

      const res = await adapter.searchUsers('john');

      expect(res).toEqual({ items: [], nextCursor: null, hasMore: false, total: 0 });
   });

   it('should emit index event with explicit userId', () => {
      adapter.emitIndexEvent('user.created', { userId: 'usr_uuid_12345678_0001' });
      expect(searchClient.emit).toHaveBeenCalledWith('user.created', { userId: 'usr_uuid_12345678_0001' });
   });
});
