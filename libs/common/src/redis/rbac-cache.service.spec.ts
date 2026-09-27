import { ClientProxy } from '@nestjs/microservices';
import { of, throwError } from 'rxjs';
import { AUTH_PATTERNS, REDIS_KEY_PREFIX } from '@common/constants';
import { RbacCacheService } from '@common/redis/rbac-cache.service';
import { RedisService } from '@common/redis/redis.service';

describe('RbacCacheService', () => {
   let service: RbacCacheService;
   const mockGet = jest.fn();
   const mockSet = jest.fn();
   const mockDel = jest.fn();
   const mockGetJson = jest.fn();
   const mockSetJson = jest.fn();
   const mockAuthClientSend = jest.fn();

   beforeEach(() => {
      jest.clearAllMocks();

      const mockRedisService = {
         get: mockGet,
         set: mockSet,
         del: mockDel,
         getJson: mockGetJson,
         setJson: mockSetJson,
      } as unknown as RedisService;

      const mockAuthClient = {
         send: mockAuthClientSend,
      } as unknown as ClientProxy;

      service = new RbacCacheService(mockRedisService, mockAuthClient);
   });

   it('should get role from Redis by key', async () => {
      const mockRole = {
         id: 'role-1',
         code: 'USER',
         name: 'Standard User',
         description: 'desc',
         permissions: ['USERS:READ'],
      };
      mockGetJson.mockResolvedValue(mockRole);

      const result = await service.getRole('USER');
      expect(mockGetJson).toHaveBeenCalledWith(`${REDIS_KEY_PREFIX.ROLE}USER`);
      expect(result).toEqual(mockRole);
   });

   it('should set role and permissions in Redis', async () => {
      const roleData = {
         id: 'role-1',
         code: 'USER',
         name: 'Standard User',
         description: 'desc',
         permissions: ['USERS:READ'],
      };

      await service.setRole('USER', roleData);
      expect(mockSetJson).toHaveBeenCalledWith(`${REDIS_KEY_PREFIX.ROLE}USER`, roleData, expect.any(Number));
      expect(mockSetJson).toHaveBeenCalledWith(
         `${REDIS_KEY_PREFIX.ROLE_PERMISSIONS}USER`,
         roleData.permissions,
         expect.any(Number),
      );
   });

   it('should get role permissions from permissions key if available', async () => {
      mockGetJson.mockResolvedValue(['USERS:READ', 'USERS:UPDATE']);

      const perms = await service.getRolePermissions('USER');
      expect(mockGetJson).toHaveBeenCalledWith(`${REDIS_KEY_PREFIX.ROLE_PERMISSIONS}USER`);
      expect(perms).toEqual(['USERS:READ', 'USERS:UPDATE']);
   });

   it('should fallback to authClient RPC when cache misses and authClient is available', async () => {
      mockGetJson.mockResolvedValue(null);
      mockAuthClientSend.mockReturnValue(of(['USERS:READ', 'USERS:CREATE']));

      const perms = await service.getRolePermissions('USER');
      expect(mockAuthClientSend).toHaveBeenCalledWith(
         { cmd: AUTH_PATTERNS.GET_ROLE_PERMISSIONS },
         { roleCode: 'USER' },
      );
      expect(perms).toEqual(['USERS:READ', 'USERS:CREATE']);
   });

   it('should return null if authClient RPC throws error', async () => {
      mockGetJson.mockResolvedValue(null);
      mockAuthClientSend.mockReturnValue(throwError(() => new Error('RPC error')));

      const perms = await service.getRolePermissions('USER');
      expect(perms).toBeNull();
   });

   it('should invalidate role and permissions keys', async () => {
      await service.invalidateRole('USER');
      expect(mockDel).toHaveBeenCalledWith(`${REDIS_KEY_PREFIX.ROLE}USER`);
      expect(mockDel).toHaveBeenCalledWith(`${REDIS_KEY_PREFIX.ROLE_PERMISSIONS}USER`);
   });
});
