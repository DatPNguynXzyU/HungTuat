import { CommonConfigService } from '@common/config/common-config.service';
import { RedisService } from '@common/redis/redis.service';

describe('RedisService', () => {
   let service: RedisService;
   let mockConfigService: jest.Mocked<CommonConfigService>;

   beforeEach(() => {
      mockConfigService = {
         redis: {
            host: 'localhost',
            port: 6379,
            password: '',
         },
      } as unknown as jest.Mocked<CommonConfigService>;

      service = new RedisService(mockConfigService);
   });

   it('should initialize without error on module init', () => {
      expect(() => service.onModuleInit()).not.toThrow();
   });

   it('should handle get and setJson gracefully when client is not connected', async () => {
      const data = await service.get('non-existent');
      expect(data).toBeNull();

      await expect(service.setJson('key', { a: 1 })).resolves.not.toThrow();
   });

   it('should clean up client on module destroy', async () => {
      await expect(service.onModuleDestroy()).resolves.not.toThrow();
   });
});
