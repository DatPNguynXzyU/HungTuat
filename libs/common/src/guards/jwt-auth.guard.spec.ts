import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CommonConfigService } from '@common/config/common-config.service';
import { AUTH_ERROR_REASONS } from '@common/constants/auth.constant';
import { DEFAULT_DEV_RSA_PRIVATE_KEY, DEFAULT_DEV_RSA_PUBLIC_KEY } from '@common/constants/jwt.constant';
import { REDIS_KEY_PREFIX } from '@common/constants/redis.constant';
import { COMMON_ERROR_CODES } from '@common/exceptions/error-codes';
import { UnauthorizedException } from '@common/exceptions/http.exceptions';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RedisService } from '@common/redis/redis.service';
import { JwtUtil } from '@common/utils/jwt.util';

describe('JwtAuthGuard', () => {
   let guard: JwtAuthGuard;
   let mockConfigService: jest.Mocked<CommonConfigService>;
   let mockReflector: jest.Mocked<Reflector>;
   let mockRedisService: jest.Mocked<RedisService>;

   const privateKey = DEFAULT_DEV_RSA_PRIVATE_KEY;
   const publicKey = DEFAULT_DEV_RSA_PUBLIC_KEY;

   beforeEach(() => {
      mockConfigService = {
         jwtPublicKey: publicKey,
         jwtSecret: publicKey,
         cookieName: 'access_token',
      } as unknown as jest.Mocked<CommonConfigService>;

      mockReflector = {
         getAllAndOverride: jest.fn().mockReturnValue(false),
      } as unknown as jest.Mocked<Reflector>;

      mockRedisService = {
         get: jest.fn().mockResolvedValue(null),
      } as unknown as jest.Mocked<RedisService>;

      guard = new JwtAuthGuard(mockConfigService, mockReflector, mockRedisService);
   });

   it('should allow public routes without token', async () => {
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

      expect(await guard.canActivate(mockContext)).toBe(true);
   });

   it('should allow request with valid bearer token', async () => {
      const token = JwtUtil.sign({ sub: 'user-1', email: 'user@example.com', jti: 'jti-1' }, privateKey, 3600);
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

      expect(await guard.canActivate(mockContext)).toBe(true);
      expect((mockRequest as { user?: { sub: string } }).user?.sub).toBe('user-1');
   });

   it('should throw UnauthorizedException when token JTI is in Redis blacklist', async () => {
      const token = JwtUtil.sign({ sub: 'user-1', email: 'user@example.com', jti: 'revoked-jti' }, privateKey, 3600);
      mockRedisService.get.mockImplementation((key: string) => {
         if (key === `${REDIS_KEY_PREFIX.REVOKED_TOKEN}revoked-jti`) return Promise.resolve('revoked');
         return Promise.resolve(null);
      });

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

      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
      try {
         await guard.canActivate(mockContext);
      } catch (err) {
         expect(err).toBeInstanceOf(UnauthorizedException);
         expect((err as UnauthorizedException).params).toEqual({ reason: AUTH_ERROR_REASONS.TOKEN_REVOKED });
      }
   });

   it('should throw UnauthorizedException when user tokens were revoked globally before token issuance', async () => {
      const nowSeconds = Math.floor(Date.now() / 1000);
      const token = JwtUtil.sign(
         { sub: 'user-1', email: 'user@example.com', jti: 'jti-old', iat: nowSeconds - 100 },
         privateKey,
         3600,
      );
      mockRedisService.get.mockImplementation((key: string) => {
         if (key === `${REDIS_KEY_PREFIX.USER_REVOKED_AT}user-1`) return Promise.resolve(String(nowSeconds));
         return Promise.resolve(null);
      });

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

      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
      try {
         await guard.canActivate(mockContext);
      } catch (err) {
         expect(err).toBeInstanceOf(UnauthorizedException);
         expect((err as UnauthorizedException).params).toEqual({ reason: AUTH_ERROR_REASONS.USER_TOKENS_REVOKED });
      }
   });

   it('should allow request with case-insensitive bearer token header', async () => {
      const token = JwtUtil.sign({ sub: 'user-ci', email: 'ci@example.com' }, privateKey, 3600);
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

      expect(await guard.canActivate(mockContext)).toBe(true);
      expect((mockRequest as { user?: { sub: string } }).user?.sub).toBe('user-ci');
   });

   it('should allow request with valid cookie token', async () => {
      const token = JwtUtil.sign({ sub: 'user-2', email: 'cookie@example.com' }, privateKey, 3600);
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

      expect(await guard.canActivate(mockContext)).toBe(true);
      expect((mockRequest as { user?: { sub: string } }).user?.sub).toBe('user-2');
   });

   it('should throw UnauthorizedException when no token is present on protected route', async () => {
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

      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
      try {
         await guard.canActivate(mockContext);
      } catch (err) {
         expect(err).toBeInstanceOf(UnauthorizedException);
         expect((err as UnauthorizedException).errorCode).toBe(COMMON_ERROR_CODES.UNAUTHORIZED);
         expect((err as UnauthorizedException).params).toEqual({ reason: AUTH_ERROR_REASONS.TOKEN_MISSING });
      }
   });

   it('should throw UnauthorizedException when token is invalid', async () => {
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

      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
      try {
         await guard.canActivate(mockContext);
      } catch (err) {
         expect(err).toBeInstanceOf(UnauthorizedException);
         expect((err as UnauthorizedException).errorCode).toBe(COMMON_ERROR_CODES.UNAUTHORIZED);
         expect((err as UnauthorizedException).params).toEqual({ reason: AUTH_ERROR_REASONS.TOKEN_INVALID_OR_EXPIRED });
      }
   });

   it('should throw UnauthorizedException when token type is not access', async () => {
      const token = JwtUtil.sign(
         { sub: 'user-refresh', email: 'r@example.com', tokenType: 'refresh' },
         privateKey,
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

      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
      try {
         await guard.canActivate(mockContext);
      } catch (err) {
         expect(err).toBeInstanceOf(UnauthorizedException);
         expect((err as UnauthorizedException).errorCode).toBe(COMMON_ERROR_CODES.UNAUTHORIZED);
         expect((err as UnauthorizedException).params).toEqual({ reason: AUTH_ERROR_REASONS.INVALID_TOKEN_TYPE });
      }
   });
});
