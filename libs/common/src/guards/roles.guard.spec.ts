import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DEFAULT_ROLES } from '@common/constants';
import { IS_PUBLIC_KEY } from '@common/decorators/public.decorator';
import { ForbiddenException, UnauthorizedException } from '@common/exceptions/http.exceptions';
import { RolesGuard } from '@common/guards/roles.guard';

describe('RolesGuard', () => {
   let guard: RolesGuard;
   let mockReflector: jest.Mocked<Reflector>;

   beforeEach(() => {
      mockReflector = {
         getAllAndOverride: jest.fn(),
      } as unknown as jest.Mocked<Reflector>;

      guard = new RolesGuard(mockReflector);
   });

   it('should allow access if route is public', () => {
      mockReflector.getAllAndOverride.mockImplementation((key) => {
         if (key === IS_PUBLIC_KEY) return true;
         return [DEFAULT_ROLES.SUPER_ADMIN];
      });

      const context = {
         getHandler: () => {},
         getClass: () => {},
         switchToHttp: () => ({
            getRequest: () => ({}),
         }),
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

   it('should throw UnauthorizedException if request has no user', () => {
      mockReflector.getAllAndOverride.mockImplementation((key) => {
         if (key === IS_PUBLIC_KEY) return false;
         return [DEFAULT_ROLES.SUPER_ADMIN];
      });
      const context = {
         getHandler: () => {},
         getClass: () => {},
         switchToHttp: () => ({
            getRequest: () => ({}),
         }),
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
   });

   it('should allow SUPER_ADMIN to bypass role checks', () => {
      mockReflector.getAllAndOverride.mockImplementation((key) => {
         if (key === IS_PUBLIC_KEY) return false;
         return ['MANAGER'];
      });
      const context = {
         getHandler: () => {},
         getClass: () => {},
         switchToHttp: () => ({
            getRequest: () => ({
               user: {
                  sub: 'admin-id',
                  roles: [DEFAULT_ROLES.SUPER_ADMIN],
               },
            }),
         }),
      } as unknown as ExecutionContext;

      expect(guard.canActivate(context)).toBe(true);
   });

   it('should allow user if has matching role', () => {
      mockReflector.getAllAndOverride.mockImplementation((key) => {
         if (key === IS_PUBLIC_KEY) return false;
         return [DEFAULT_ROLES.USER];
      });
      const context = {
         getHandler: () => {},
         getClass: () => {},
         switchToHttp: () => ({
            getRequest: () => ({
               user: {
                  sub: 'user-id',
                  roles: [DEFAULT_ROLES.USER],
               },
            }),
         }),
      } as unknown as ExecutionContext;

      expect(guard.canActivate(context)).toBe(true);
   });

   it('should throw ForbiddenException if user does not have matching role', () => {
      mockReflector.getAllAndOverride.mockImplementation((key) => {
         if (key === IS_PUBLIC_KEY) return false;
         return [DEFAULT_ROLES.SUPER_ADMIN];
      });
      const context = {
         getHandler: () => {},
         getClass: () => {},
         switchToHttp: () => ({
            getRequest: () => ({
               user: {
                  sub: 'user-id',
                  roles: [DEFAULT_ROLES.USER],
               },
            }),
         }),
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
   });
});
