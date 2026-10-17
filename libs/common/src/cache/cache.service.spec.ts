import { Test, TestingModule } from '@nestjs/testing';
import { CacheNamespace } from '@common/cache/cache-namespace.enum';
import { CacheService } from '@common/cache/cache.service';
import { CacheHealthState } from '@common/constants/health.constant';
import { RedisService } from '@common/redis/redis.service';
import { CacheEntry } from '@common/cache/cache.interface';

describe('CacheService', () => {
   let service: CacheService;

   const mockPipeline = {
      set: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
   };

   const mockClient = {
      del: jest.fn(),
      exists: jest.fn(),
      mget: jest.fn(),
      ttl: jest.fn(),
      expire: jest.fn(),
      expireat: jest.fn(),
      pipeline: jest.fn().mockReturnValue(mockPipeline),
   };

   const mockRedisService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      ttl: jest.fn(),
      incr: jest.fn(),
      expire: jest.fn(),
      deleteByPattern: jest.fn(),
      getClient: jest.fn().mockReturnValue(mockClient),
      healthCheck: jest.fn(),
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            CacheService,
            {
               provide: RedisService,
               useValue: mockRedisService,
            },
         ],
      }).compile();

      service = module.get<CacheService>(CacheService);
   });

   describe('key namespacing', () => {
      it('should format keys following the {namespace}:{key} pattern', async () => {
         mockRedisService.get.mockResolvedValue('value');
         await service.get(CacheNamespace.USER, '123');
         expect(mockRedisService.get).toHaveBeenCalledWith('user:123');
      });

      it('should not double-prefix when key already starts with namespace', async () => {
         mockRedisService.get.mockResolvedValue('value');
         await service.get(CacheNamespace.USER, 'user:123');
         expect(mockRedisService.get).toHaveBeenCalledWith('user:123');
      });
   });

   describe('get and set', () => {
      it('should return null when key does not exist', async () => {
         mockRedisService.get.mockResolvedValue(null);
         const res = await service.get(CacheNamespace.AUTH, 'missing');
         expect(res).toBeNull();
      });

      it('should return plain string as-is', async () => {
         mockRedisService.get.mockResolvedValue('raw-string-token');
         const res = await service.get<string>(CacheNamespace.AUTH, 'token');
         expect(res).toBe('raw-string-token');
      });

      it('should deserialize JSON objects correctly', async () => {
         mockRedisService.get.mockResolvedValue(JSON.stringify({ id: 'u1', name: 'Alice' }));
         const res = await service.get<{ id: string; name: string }>(CacheNamespace.USER, 'u1');
         expect(res).toEqual({ id: 'u1', name: 'Alice' });
      });

      it('should deserialize JSON arrays correctly', async () => {
         mockRedisService.get.mockResolvedValue(JSON.stringify(['read', 'write']));
         const res = await service.get<string[]>(CacheNamespace.AUTH, 'roles');
         expect(res).toEqual(['read', 'write']);
      });

      it('should deserialize boolean strings correctly', async () => {
         mockRedisService.get.mockResolvedValue('true');
         const resTrue = await service.get<boolean>(CacheNamespace.GATEWAY, 'flag1');
         expect(resTrue).toBe(true);

         mockRedisService.get.mockResolvedValue('false');
         const resFalse = await service.get<boolean>(CacheNamespace.GATEWAY, 'flag2');
         expect(resFalse).toBe(false);
      });

      it('should store plain string without JSON quotes', async () => {
         await service.set(CacheNamespace.AUTH, 'otp:test@example.com', '123456', 300);
         expect(mockRedisService.set).toHaveBeenCalledWith('auth:otp:test@example.com', '123456', 300);
      });

      it('should stringify objects on set', async () => {
         const obj = { id: '1', role: 'admin' };
         await service.set(CacheNamespace.USER, '1', obj, 900);
         expect(mockRedisService.set).toHaveBeenCalledWith('user:1', JSON.stringify(obj), 900);
      });
   });

   describe('delete and exists', () => {
      it('should delete a key and return true if key existed', async () => {
         mockClient.del.mockResolvedValue(1);
         const res = await service.delete(CacheNamespace.SESSION, 'sess-1');
         expect(res).toBe(true);
         expect(mockClient.del).toHaveBeenCalledWith('session:sess-1');
      });

      it('should delete via alias del()', async () => {
         mockClient.del.mockResolvedValue(1);
         const res = await service.del(CacheNamespace.SESSION, 'sess-1');
         expect(res).toBe(true);
      });

      it('should return false if key did not exist on delete', async () => {
         mockClient.del.mockResolvedValue(0);
         const res = await service.delete(CacheNamespace.SESSION, 'missing');
         expect(res).toBe(false);
      });

      it('should check if key exists', async () => {
         mockClient.exists.mockResolvedValue(1);
         const res = await service.exists(CacheNamespace.RATE_LIMIT, 'req-1');
         expect(res).toBe(true);
         expect(mockClient.exists).toHaveBeenCalledWith('rate_limit:req-1');
      });
   });

   describe('mget and mset', () => {
      it('should return empty array when mget receives empty keys', async () => {
         const res = await service.mget(CacheNamespace.USER, []);
         expect(res).toEqual([]);
      });

      it('should mget multiple keys and deserialize results', async () => {
         mockClient.mget.mockResolvedValue([JSON.stringify({ name: 'Alice' }), null, 'plain-value']);

         const res = await service.mget(CacheNamespace.USER, ['u1', 'u2', 'u3']);
         expect(mockClient.mget).toHaveBeenCalledWith('user:u1', 'user:u2', 'user:u3');
         expect(res).toEqual([{ name: 'Alice' }, null, 'plain-value']);
      });

      it('should mset entries using pipeline with TTL', async () => {
         const entries: CacheEntry<{ token: string } | string>[] = [
            { key: 's1', value: { token: 't1' }, ttl: 3600 },
            { key: 's2', value: 'token-2' },
         ];
         await service.mset(CacheNamespace.SESSION, entries);

         expect(mockPipeline.set).toHaveBeenCalledWith('session:s1', JSON.stringify({ token: 't1' }), 'EX', 3600);
         expect(mockPipeline.set).toHaveBeenCalledWith('session:s2', 'token-2');
         expect(mockPipeline.exec).toHaveBeenCalled();
      });
   });

   describe('TTL operations', () => {
      it('should getTTL for a key', async () => {
         mockRedisService.ttl.mockResolvedValue(300);
         const ttl = await service.getTTL(CacheNamespace.AUTH, 'otp');
         expect(ttl).toBe(300);
         expect(mockRedisService.ttl).toHaveBeenCalledWith('auth:otp');
      });

      it('should extendTTL by adding seconds to current TTL', async () => {
         mockClient.ttl.mockResolvedValue(100);
         mockClient.expire.mockResolvedValue(1);

         const success = await service.extendTTL(CacheNamespace.SESSION, 'sess-1', 60);
         expect(success).toBe(true);
         expect(mockClient.expire).toHaveBeenCalledWith('session:sess-1', 160);
      });

      it('should extendTTL from scratch if key has no expiry (-1)', async () => {
         mockClient.ttl.mockResolvedValue(-1);
         mockClient.expire.mockResolvedValue(1);

         const success = await service.extendTTL(CacheNamespace.SESSION, 'sess-1', 120);
         expect(success).toBe(true);
         expect(mockClient.expire).toHaveBeenCalledWith('session:sess-1', 120);
      });

      it('should fail extendTTL if key does not exist (-2) or additionalSeconds <= 0', async () => {
         mockClient.ttl.mockResolvedValue(-2);
         expect(await service.extendTTL(CacheNamespace.SESSION, 'missing', 60)).toBe(false);
         expect(await service.extendTTL(CacheNamespace.SESSION, 'key', 0)).toBe(false);
      });

      it('should setExpireAt with Date object', async () => {
         const date = new Date('2026-10-18T00:00:00Z');
         const expectedEpoch = Math.floor(date.getTime() / 1000);
         mockClient.expireat.mockResolvedValue(1);

         const res = await service.setExpireAt(CacheNamespace.AUTH, 'token', date);
         expect(res).toBe(true);
         expect(mockClient.expireat).toHaveBeenCalledWith('auth:token', expectedEpoch);
      });

      it('should setExpireAt with millisecond timestamp', async () => {
         const ms = 1792281600000;
         mockClient.expireat.mockResolvedValue(1);

         const res = await service.setExpireAt(CacheNamespace.AUTH, 'token', ms);
         expect(res).toBe(true);
         expect(mockClient.expireat).toHaveBeenCalledWith('auth:token', Math.floor(ms / 1000));
      });
   });

   describe('bulk and atomic operations', () => {
      it('should deleteByPattern with namespace prefix', async () => {
         mockRedisService.deleteByPattern.mockResolvedValue(5);
         const deleted = await service.deleteByPattern(CacheNamespace.RATE_LIMIT, 'login:*');
         expect(deleted).toBe(5);
         expect(mockRedisService.deleteByPattern).toHaveBeenCalledWith('rate_limit:login:*');
      });

      it('should delegate incr with namespace prefix', async () => {
         mockRedisService.incr.mockResolvedValue(3);
         const count = await service.incr(CacheNamespace.RATE_LIMIT, 'counter');
         expect(count).toBe(3);
         expect(mockRedisService.incr).toHaveBeenCalledWith('rate_limit:counter');
      });

      it('should delegate expire with namespace prefix', async () => {
         await service.expire(CacheNamespace.RATE_LIMIT, 'counter', 60);
         expect(mockRedisService.expire).toHaveBeenCalledWith('rate_limit:counter', 60);
      });
   });

   describe('healthCheck', () => {
      it('should delegate health check to RedisService', async () => {
         mockRedisService.healthCheck.mockResolvedValue({ status: CacheHealthState.UP, latency: 3 });
         const health = await service.healthCheck();
         expect(health).toEqual({ status: CacheHealthState.UP, latency: 3 });
         expect(mockRedisService.healthCheck).toHaveBeenCalledWith(2000);
      });
   });
});
