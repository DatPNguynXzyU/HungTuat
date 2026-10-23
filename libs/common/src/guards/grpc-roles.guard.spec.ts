import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DEFAULT_ROLES } from '@common/constants';
import { IS_PUBLIC_KEY } from '@common/decorators/public.decorator';
import { ForbiddenException, UnauthorizedException } from '@common/exceptions/http.exceptions';
import { GrpcRolesGuard } from '@common/guards/grpc-roles.guard';

const TEST_ROLES = {
   USER: DEFAULT_ROLES.USER,
   ADMIN: DEFAULT_ROLES.ADMIN,
   SUPER_ADMIN: DEFAULT_ROLES.SUPER_ADMIN,
   CUSTOM: 'TEST_CUSTOM_ROLE',
} as const;

describe('GrpcRolesGuard', () => {
   let guard: GrpcRolesGuard;
   let mockReflector: jest.Mocked<Reflector>;

   beforeEach(() => {
      mockReflector = {
         getAllAndOverride: jest.fn(),
      } as unknown as jest.Mocked<Reflector>;

      guard = new GrpcRolesGuard(mockReflector);
   });

   it('should allow access if route is public', () => {
      mockReflector.getAllAndOverride.mockImplementation((key) => {
         if (key === IS_PUBLIC_KEY) return true;
         return [TEST_ROLES.ADMIN];
      });

      const context = {
         getHandler: () => {},
         getClass: () => {},
      } as unknown as ExecutionContext;

      expect(guard.canActivate(context)).toBe(true);
   });

   it('should allow access if no roles are required', () => {
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
         return [TEST_ROLES.ADMIN];
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

   it('should allow access if user has required role', () => {
      mockReflector.getAllAndOverride.mockImplementation((key) => {
         if (key === IS_PUBLIC_KEY) return false;
         return [TEST_ROLES.ADMIN];
      });

      const context = {
         getHandler: () => {},
         getClass: () => {},
         switchToRpc: () => ({
            getContext: () => ({
               'x-user-id': 'user-123',
               'x-roles': JSON.stringify([TEST_ROLES.ADMIN]),
            }),
         }),
      } as unknown as ExecutionContext;

      expect(guard.canActivate(context)).toBe(true);
   });

   it('should allow access if user has SUPER_ADMIN role (bypass)', () => {
      mockReflector.getAllAndOverride.mockImplementation((key) => {
         if (key === IS_PUBLIC_KEY) return false;
         return [TEST_ROLES.CUSTOM];
      });

      const context = {
         getHandler: () => {},
         getClass: () => {},
         switchToRpc: () => ({
            getContext: () => ({
               'x-user-id': 'admin-123',
               'x-roles': JSON.stringify([TEST_ROLES.SUPER_ADMIN]),
            }),
         }),
      } as unknown as ExecutionContext;

      expect(guard.canActivate(context)).toBe(true);
   });

   it('should throw ForbiddenException if user lacks required role', () => {
      mockReflector.getAllAndOverride.mockImplementation((key) => {
         if (key === IS_PUBLIC_KEY) return false;
         return [TEST_ROLES.ADMIN];
      });

      const context = {
         getHandler: () => {},
         getClass: () => {},
         switchToRpc: () => ({
            getContext: () => ({
               'x-user-id': 'user-123',
               'x-roles': JSON.stringify([TEST_ROLES.USER]),
            }),
         }),
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
   });
});
