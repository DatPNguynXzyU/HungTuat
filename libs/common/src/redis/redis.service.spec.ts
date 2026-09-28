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

   it('should handle get, setJson, incr and ttl gracefully when client is not connected', async () => {
      const data = await service.get('non-existent');
      expect(data).toBeNull();

      await expect(service.setJson('key', { a: 1 })).resolves.not.toThrow();

      const incrResult = await service.incr('counter');
      expect(incrResult).toBe(0);

      const ttlResult = await service.ttl('some_key');
      expect(ttlResult).toBe(-2);
   });

   it('should handle set methods (sadd, srem, smembers, expire) gracefully when client is not connected', async () => {
      await expect(service.sadd('set_key', 'm1', 'm2')).resolves.not.toThrow();
      await expect(service.srem('set_key', 'm1')).resolves.not.toThrow();
      const members = await service.smembers('set_key');
      expect(members).toEqual([]);
      await expect(service.expire('set_key', 3600)).resolves.not.toThrow();
   });

   it('should handle deleteByPattern gracefully when client is not connected', async () => {
      const count = await service.deleteByPattern('pattern:*');
      expect(count).toBe(0);
   });

   it('should clean up client on module destroy', async () => {
      await expect(service.onModuleDestroy()).resolves.not.toThrow();
   });
});
