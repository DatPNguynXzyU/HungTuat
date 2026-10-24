import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Metadata } from '@grpc/grpc-js';
import { CommonConfigService } from '@common/config/common-config.service';
import {
   AUTH_ERROR_REASONS,
   DEFAULT_DEV_EC_PRIVATE_KEY,
   DEFAULT_DEV_EC_PUBLIC_KEY,
} from '@common/constants/jwt.constant';
import { COMMON_ERROR_CODES } from '@common/exceptions/error-codes';
import { UnauthorizedException } from '@common/exceptions/http.exceptions';
import { GrpcJwtAuthGuard } from '@common/guards/grpc-jwt-auth.guard';
import { RedisService } from '@common/redis/redis.service';
import { JwtUtil } from '@common/utils/jwt.util';

describe('GrpcJwtAuthGuard', () => {
   let guard: GrpcJwtAuthGuard;
   let mockConfigService: jest.Mocked<CommonConfigService>;
   let mockReflector: jest.Mocked<Reflector>;
   let mockRedisService: jest.Mocked<RedisService>;

   const privateKey = DEFAULT_DEV_EC_PRIVATE_KEY;
   const publicKey = DEFAULT_DEV_EC_PUBLIC_KEY;

   beforeEach(() => {
      mockConfigService = {
         jwtPublicKey: publicKey,
      } as unknown as jest.Mocked<CommonConfigService>;

      mockReflector = {
         getAllAndOverride: jest.fn().mockReturnValue(false),
      } as unknown as jest.Mocked<Reflector>;

      mockRedisService = {
         get: jest.fn().mockResolvedValue(null),
      } as unknown as jest.Mocked<RedisService>;

      guard = new GrpcJwtAuthGuard(mockConfigService, mockReflector, mockRedisService);
   });

   function createMockRpcContext(metadata: Metadata, data: Record<string, unknown> = {}): ExecutionContext {
      return {
         getHandler: () => {},
         getClass: () => {},
         switchToRpc: () => ({
            getContext: () => metadata,
            getData: () => data,
         }),
      } as unknown as ExecutionContext;
   }

   it('should allow public gRPC methods without token', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(true);
      const metadata = new Metadata();
      const context = createMockRpcContext(metadata);

      expect(await guard.canActivate(context)).toBe(true);
   });

   it('should throw UnauthorizedException if authorization metadata is missing', async () => {
      const metadata = new Metadata();
      const context = createMockRpcContext(metadata);

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      try {
         await guard.canActivate(context);
      } catch (err: unknown) {
         const ex = err as UnauthorizedException;
         expect(ex.errorCode).toBe(COMMON_ERROR_CODES.UNAUTHORIZED);
         expect(ex.params?.reason).toBe(AUTH_ERROR_REASONS.TOKEN_MISSING);
      }
   });

   it('should validate bearer token and attach user to rpc data', async () => {
      const token = JwtUtil.sign({ sub: 'user-123', email: 'supplier@example.com' }, privateKey, 3600);

      const metadata = new Metadata();
      metadata.set('authorization', `Bearer ${token}`);
      const rpcData: Record<string, unknown> = { supplierName: 'Test' };
      const context = createMockRpcContext(metadata, rpcData);

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(rpcData.user).toBeDefined();
      expect((rpcData.user as { sub: string }).sub).toBe('user-123');
   });

   it('should reject invalid or expired tokens', async () => {
      const metadata = new Metadata();
      metadata.set('authorization', 'Bearer invalid.token.payload');
      const context = createMockRpcContext(metadata);

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
   });

   it('should reject blacklisted tokens in redis', async () => {
      const token = JwtUtil.sign({ sub: 'user-123', jti: 'revoked-jti' }, privateKey, 3600);

      mockRedisService.get.mockResolvedValue('revoked');

      const metadata = new Metadata();
      metadata.set('authorization', `Bearer ${token}`);
      const context = createMockRpcContext(metadata);

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
   });
});
