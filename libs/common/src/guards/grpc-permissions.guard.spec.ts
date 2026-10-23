import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DEFAULT_ROLES } from '@common/constants';
import { IS_PUBLIC_KEY } from '@common/decorators/public.decorator';
import { ForbiddenException, UnauthorizedException } from '@common/exceptions/http.exceptions';
import { GrpcPermissionsGuard } from '@common/guards/grpc-permissions.guard';

const TEST_PERMISSIONS = {
   READ: 'TEST_RESOURCE:READ',
   WRITE: 'TEST_RESOURCE:WRITE',
   OTHER: 'TEST_RESOURCE:OTHER',
} as const;

const TEST_ROLES = {
   USER: DEFAULT_ROLES.USER,
   ADMIN: DEFAULT_ROLES.ADMIN,
   SUPER_ADMIN: DEFAULT_ROLES.SUPER_ADMIN,
} as const;

describe('GrpcPermissionsGuard', () => {
   let guard: GrpcPermissionsGuard;
   let mockReflector: jest.Mocked<Reflector>;

   beforeEach(() => {
      mockReflector = {
         getAllAndOverride: jest.fn(),
      } as unknown as jest.Mocked<Reflector>;

      guard = new GrpcPermissionsGuard(mockReflector);
   });

   it('should allow access if route is public', () => {
      mockReflector.getAllAndOverride.mockImplementation((key) => {
         if (key === IS_PUBLIC_KEY) return true;
         return [TEST_PERMISSIONS.READ];
      });

      const context = {
         getHandler: () => {},
         getClass: () => {},
      } as unknown as ExecutionContext;

      expect(guard.canActivate(context)).toBe(true);
   });

   it('should allow access if no permissions are required', () => {
      mockReflector.getAllAndOverride.mockImplementation((key) => {
         if (key === IS_PUBLIC_KEY) return false;
         return null;
      });

      const context = {
         getHandler: () => {},
         getClass: () => {},
      } as unknown as ExecutionContext;

      expect(guard.canActivate(context)).toBe(true);
   });

   it('should throw UnauthorizedException if metadata has no user context', () => {
      mockReflector.getAllAndOverride.mockImplementation((key) => {
         if (key === IS_PUBLIC_KEY) return false;
         return [TEST_PERMISSIONS.READ];
      });

      const context = {
         getHandler: () => {},
         getClass: () => {},
         switchToRpc: () => ({
            getContext: () => ({}),
         }),
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
   });

   it('should allow access if user has required permissions', () => {
      mockReflector.getAllAndOverride.mockImplementation((key) => {
         if (key === IS_PUBLIC_KEY) return false;
         return [TEST_PERMISSIONS.READ];
      });

      const context = {
         getHandler: () => {},
         getClass: () => {},
         switchToRpc: () => ({
            getContext: () => ({
               'x-user-id': 'user-123',
               'x-roles': JSON.stringify([TEST_ROLES.USER]),
               'x-permissions': JSON.stringify([TEST_PERMISSIONS.READ, TEST_PERMISSIONS.WRITE]),
            }),
         }),
      } as unknown as ExecutionContext;

      expect(guard.canActivate(context)).toBe(true);
   });

   it('should allow access if user is SUPER_ADMIN (bypass)', () => {
      mockReflector.getAllAndOverride.mockImplementation((key) => {
         if (key === IS_PUBLIC_KEY) return false;
         return [TEST_PERMISSIONS.READ];
      });

      const context = {
         getHandler: () => {},
         getClass: () => {},
         switchToRpc: () => ({
            getContext: () => ({
               'x-user-id': 'admin-123',
               'x-roles': JSON.stringify([TEST_ROLES.SUPER_ADMIN]),
               'x-permissions': JSON.stringify([]),
            }),
         }),
      } as unknown as ExecutionContext;

      expect(guard.canActivate(context)).toBe(true);
   });

   it('should throw ForbiddenException if user lacks required permissions', () => {
      mockReflector.getAllAndOverride.mockImplementation((key) => {
         if (key === IS_PUBLIC_KEY) return false;
         return [TEST_PERMISSIONS.READ];
      });

      const context = {
         getHandler: () => {},
         getClass: () => {},
         switchToRpc: () => ({
            getContext: () => ({
               'x-user-id': 'user-123',
               'x-roles': JSON.stringify([TEST_ROLES.USER]),
               'x-permissions': JSON.stringify([TEST_PERMISSIONS.OTHER]),
            }),
         }),
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
   });
});
