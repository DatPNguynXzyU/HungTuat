import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DEFAULT_ROLES } from '@common/constants';
import { IS_PUBLIC_KEY } from '@common/decorators/public.decorator';
import { ForbiddenException, UnauthorizedException } from '@common/exceptions/http.exceptions';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { RbacCacheService } from '@common/redis/rbac-cache.service';

const TEST_PERMISSIONS = {
   READ: 'TEST_USER:READ',
   UPDATE: 'TEST_USER:UPDATE',
   DELETE: 'TEST_USER:DELETE',
} as const;

describe('PermissionsGuard', () => {
   let guard: PermissionsGuard;
   const mockGetAllAndOverride = jest.fn();
   const mockGetRolePermissions = jest.fn();

   beforeEach(() => {
      jest.clearAllMocks();

      const mockReflector = {
         getAllAndOverride: mockGetAllAndOverride,
      } as unknown as Reflector;

      const mockRbacCacheService = {
         getRolePermissions: mockGetRolePermissions,
      } as unknown as RbacCacheService;

      guard = new PermissionsGuard(mockReflector, mockRbacCacheService);
   });

   it('should allow access if route is public', async () => {
      mockGetAllAndOverride.mockImplementation((key) => {
         if (key === IS_PUBLIC_KEY) return true;
         return [TEST_PERMISSIONS.READ];
      });
      const context = {
         getHandler: () => {},
         getClass: () => {},
      } as unknown as ExecutionContext;

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
   });

   it('should allow access if no permissions are required', async () => {
      mockGetAllAndOverride.mockImplementation((key) => {
         if (key === IS_PUBLIC_KEY) return false;
         return null;
      });
      const context = {
         getHandler: () => {},
         getClass: () => {},
      } as unknown as ExecutionContext;

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
   });

   it('should throw UnauthorizedException if request has no user', async () => {
      mockGetAllAndOverride.mockImplementation((key) => {
         if (key === IS_PUBLIC_KEY) return false;
         return [TEST_PERMISSIONS.READ];
      });
      const context = {
         getHandler: () => {},
         getClass: () => {},
         switchToHttp: () => ({
            getRequest: () => ({}),
         }),
      } as unknown as ExecutionContext;

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
   });

   it('should allow SUPER_ADMIN to bypass permission checks', async () => {
      mockGetAllAndOverride.mockImplementation((key) => {
         if (key === IS_PUBLIC_KEY) return false;
         return [TEST_PERMISSIONS.DELETE];
      });
      const context = {
         getHandler: () => {},
         getClass: () => {},
         switchToHttp: () => ({
            getRequest: () => ({
               user: {
                  sub: 'admin-id',
                  email: 'admin@example.com',
                  roles: [DEFAULT_ROLES.SUPER_ADMIN],
               },
            }),
         }),
      } as unknown as ExecutionContext;

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(mockGetRolePermissions).not.toHaveBeenCalled();
   });

   it('should allow user if role contains required permissions', async () => {
      mockGetAllAndOverride.mockImplementation((key) => {
         if (key === IS_PUBLIC_KEY) return false;
         return [TEST_PERMISSIONS.READ];
      });
      mockGetRolePermissions.mockResolvedValue([TEST_PERMISSIONS.READ, TEST_PERMISSIONS.UPDATE]);

      const context = {
         getHandler: () => {},
         getClass: () => {},
         switchToHttp: () => ({
            getRequest: () => ({
               user: {
                  sub: 'user-id',
                  email: 'user@example.com',
                  roles: [DEFAULT_ROLES.USER],
               },
            }),
         }),
      } as unknown as ExecutionContext;

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(mockGetRolePermissions).toHaveBeenCalledWith(DEFAULT_ROLES.USER);
   });

   it('should throw ForbiddenException if user lacks required permissions', async () => {
      mockGetAllAndOverride.mockImplementation((key) => {
         if (key === IS_PUBLIC_KEY) return false;
         return [TEST_PERMISSIONS.DELETE];
      });
      mockGetRolePermissions.mockResolvedValue([TEST_PERMISSIONS.READ]);

      const context = {
         getHandler: () => {},
         getClass: () => {},
         switchToHttp: () => ({
            getRequest: () => ({
               user: {
                  sub: 'user-id',
                  email: 'user@example.com',
                  roles: [DEFAULT_ROLES.USER],
               },
            }),
         }),
      } as unknown as ExecutionContext;

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
   });

   it('should throw ForbiddenException if user has no roles', async () => {
      mockGetAllAndOverride.mockImplementation((key) => {
         if (key === IS_PUBLIC_KEY) return false;
         return [TEST_PERMISSIONS.READ];
      });

      const context = {
         getHandler: () => {},
         getClass: () => {},
         switchToHttp: () => ({
            getRequest: () => ({
               user: {
                  sub: 'user-id',
                  email: 'user@example.com',
                  roles: [],
               },
            }),
         }),
      } as unknown as ExecutionContext;

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
   });
});
