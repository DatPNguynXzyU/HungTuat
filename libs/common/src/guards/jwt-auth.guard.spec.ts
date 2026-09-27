import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CommonConfigService } from '@common/config/common-config.service';
import { COMMON_ERROR_CODES } from '@common/exceptions/error-codes';
import { UnauthorizedException } from '@common/exceptions/http.exceptions';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { JwtUtil } from '@common/utils/jwt.util';

describe('JwtAuthGuard', () => {
   let guard: JwtAuthGuard;
   let mockConfigService: jest.Mocked<CommonConfigService>;
   let mockReflector: jest.Mocked<Reflector>;

   beforeEach(() => {
      mockConfigService = {
         jwtSecret: 'test-secret',
         cookieName: 'access_token',
      } as unknown as jest.Mocked<CommonConfigService>;

      mockReflector = {
         getAllAndOverride: jest.fn().mockReturnValue(false),
      } as unknown as jest.Mocked<Reflector>;

      guard = new JwtAuthGuard(mockConfigService, mockReflector);
   });

   it('should allow public routes without token', () => {
      mockReflector.getAllAndOverride.mockReturnValue(true);

      const mockRequest = {
         headers: {},
         cookies: {},
      };

      const mockContext = {
         getHandler: () => {},
         getClass: () => {},
         switchToHttp: () => ({
            getRequest: () => mockRequest,
         }),
      } as unknown as ExecutionContext;

      expect(guard.canActivate(mockContext)).toBe(true);
   });

   it('should allow request with valid bearer token', () => {
      const token = JwtUtil.sign({ sub: 'user-1', email: 'user@example.com' }, 'test-secret', 3600);
      const mockRequest = {
         headers: {
            authorization: `Bearer ${token}`,
         },
         cookies: {},
      };

      const mockContext = {
         getHandler: () => {},
         getClass: () => {},
         switchToHttp: () => ({
            getRequest: () => mockRequest,
         }),
      } as unknown as ExecutionContext;

      expect(guard.canActivate(mockContext)).toBe(true);
      expect((mockRequest as { user?: { sub: string } }).user?.sub).toBe('user-1');
   });

   it('should allow request with case-insensitive bearer token header', () => {
      const token = JwtUtil.sign({ sub: 'user-ci', email: 'ci@example.com' }, 'test-secret', 3600);
      const mockRequest = {
         headers: {
            authorization: `bearer ${token}`,
         },
         cookies: {},
      };

      const mockContext = {
         getHandler: () => {},
         getClass: () => {},
         switchToHttp: () => ({
            getRequest: () => mockRequest,
         }),
      } as unknown as ExecutionContext;

      expect(guard.canActivate(mockContext)).toBe(true);
      expect((mockRequest as { user?: { sub: string } }).user?.sub).toBe('user-ci');
   });

   it('should allow request with valid cookie token', () => {
      const token = JwtUtil.sign({ sub: 'user-2', email: 'cookie@example.com' }, 'test-secret', 3600);
      const mockRequest = {
         headers: {},
         cookies: {
            access_token: token,
         },
      };

      const mockContext = {
         getHandler: () => {},
         getClass: () => {},
         switchToHttp: () => ({
            getRequest: () => mockRequest,
         }),
      } as unknown as ExecutionContext;

      expect(guard.canActivate(mockContext)).toBe(true);
      expect((mockRequest as { user?: { sub: string } }).user?.sub).toBe('user-2');
   });

   it('should throw UnauthorizedException when no token is present on protected route', () => {
      const mockRequest = {
         headers: {},
         cookies: {},
      };

      const mockContext = {
         getHandler: () => {},
         getClass: () => {},
         switchToHttp: () => ({
            getRequest: () => mockRequest,
         }),
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(mockContext)).toThrow(UnauthorizedException);
      try {
         guard.canActivate(mockContext);
      } catch (err) {
         expect(err).toBeInstanceOf(UnauthorizedException);
         expect((err as UnauthorizedException).errorCode).toBe(COMMON_ERROR_CODES.UNAUTHORIZED);
         expect((err as UnauthorizedException).params).toEqual({ reason: 'token_missing' });
      }
   });

   it('should throw UnauthorizedException when token is invalid', () => {
      const mockRequest = {
         headers: {
            authorization: 'Bearer invalid.token.payload',
         },
         cookies: {},
      };

      const mockContext = {
         getHandler: () => {},
         getClass: () => {},
         switchToHttp: () => ({
            getRequest: () => mockRequest,
         }),
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(mockContext)).toThrow(UnauthorizedException);
      try {
         guard.canActivate(mockContext);
      } catch (err) {
         expect(err).toBeInstanceOf(UnauthorizedException);
         expect((err as UnauthorizedException).errorCode).toBe(COMMON_ERROR_CODES.UNAUTHORIZED);
         expect((err as UnauthorizedException).params).toEqual({ reason: 'token_invalid_or_expired' });
      }
   });

   it('should throw UnauthorizedException when token type is not access', () => {
      const token = JwtUtil.sign(
         { sub: 'user-refresh', email: 'r@example.com', tokenType: 'refresh' },
         'test-secret',
         3600,
      );
      const mockRequest = {
         headers: {
            authorization: `Bearer ${token}`,
         },
         cookies: {},
      };

      const mockContext = {
         getHandler: () => {},
         getClass: () => {},
         switchToHttp: () => ({
            getRequest: () => mockRequest,
         }),
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(mockContext)).toThrow(UnauthorizedException);
      try {
         guard.canActivate(mockContext);
      } catch (err) {
         expect(err).toBeInstanceOf(UnauthorizedException);
         expect((err as UnauthorizedException).errorCode).toBe(COMMON_ERROR_CODES.UNAUTHORIZED);
         expect((err as UnauthorizedException).params).toEqual({ reason: 'invalid_token_type' });
      }
   });
});
