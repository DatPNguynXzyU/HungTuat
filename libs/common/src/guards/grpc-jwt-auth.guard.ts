import { CanActivate, ExecutionContext, Injectable, Optional } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Metadata } from '@grpc/grpc-js';
import type { VerifyOptions } from 'jsonwebtoken';
import { CommonConfigService } from '@common/config/common-config.service';
import {
   AUTH_ERROR_REASONS,
   DEFAULT_JWT_AUDIENCE,
   DEFAULT_JWT_ISSUER,
   JWT_ALGORITHM,
   JWT_TOKEN_TYPE,
} from '@common/constants/jwt.constant';
import { AuthRevocationRedisKeys } from '@common/constants/redis.constant';
import { IS_PUBLIC_KEY } from '@common/decorators/public.decorator';
import { COMMON_ERROR_CODES } from '@common/exceptions/error-codes';
import { UnauthorizedException } from '@common/exceptions/http.exceptions';
import { RedisService } from '@common/redis/redis.service';
import { JwtUtil } from '@common/utils/jwt.util';

/**
 * Universal gRPC Guard that validates JWT bearer tokens extracted from gRPC Metadata.
 * Supports token signature verification, tokenType validation, and Redis revocation checks.
 */
@Injectable()
export class GrpcJwtAuthGuard implements CanActivate {
   constructor(
      private readonly config: CommonConfigService,
      private readonly reflector: Reflector,
      @Optional() private readonly redisService?: RedisService,
   ) {}

   private getVerifyOptions(): VerifyOptions {
      return {
         algorithms: [JWT_ALGORITHM.ES256],
         issuer: this.config.jwtIssuer || DEFAULT_JWT_ISSUER,
         audience: this.config.jwtAudience || DEFAULT_JWT_AUDIENCE,
      };
   }

   async canActivate(context: ExecutionContext): Promise<boolean> {
      const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
         context.getHandler(),
         context.getClass(),
      ]);

      if (isPublic) {
         return true;
      }

      const rpc = context.switchToRpc();
      const metadata = rpc.getContext<Metadata>();

      const rawHeader = metadata?.get('authorization')?.[0] || metadata?.get('x-authorization')?.[0];

      const headerStr = typeof rawHeader === 'string' ? rawHeader : rawHeader?.toString();
      const token = this.extractToken(headerStr);

      if (!token) {
         throw new UnauthorizedException(COMMON_ERROR_CODES.UNAUTHORIZED, {
            params: { reason: AUTH_ERROR_REASONS.TOKEN_MISSING },
         });
      }

      try {
         const payload = JwtUtil.verify(token, this.config.jwtPublicKey, this.getVerifyOptions());

         if (payload.tokenType && payload.tokenType !== JWT_TOKEN_TYPE.ACCESS) {
            throw new UnauthorizedException(COMMON_ERROR_CODES.UNAUTHORIZED, {
               params: { reason: AUTH_ERROR_REASONS.INVALID_TOKEN_TYPE },
            });
         }

         if (this.redisService) {
            if (payload.jti) {
               const revokedKey = AuthRevocationRedisKeys.revokedToken(payload.jti);
               const isBlacklisted = await this.redisService.get(revokedKey);
               if (isBlacklisted) {
                  throw new UnauthorizedException(COMMON_ERROR_CODES.UNAUTHORIZED, {
                     params: { reason: AUTH_ERROR_REASONS.TOKEN_REVOKED },
                  });
               }
            }

            if (payload.sub) {
               const userRevokedAtKey = AuthRevocationRedisKeys.accountRevokedAt(payload.sub);
               const revokedAt = await this.redisService.get(userRevokedAtKey);
               if (revokedAt && payload.iat) {
                  const revokedAtTimestamp = Number(revokedAt);
                  if (payload.iat <= revokedAtTimestamp) {
                     throw new UnauthorizedException(COMMON_ERROR_CODES.UNAUTHORIZED, {
                        params: { reason: AUTH_ERROR_REASONS.USER_TOKENS_REVOKED },
                     });
                  }
               }
            }
         }

         const data = rpc.getData<Record<string, unknown>>();
         if (data && typeof data === 'object') {
            data.user = payload;
         }

         return true;
      } catch (err: unknown) {
         if (err instanceof UnauthorizedException) {
            throw err;
         }
         throw new UnauthorizedException(COMMON_ERROR_CODES.UNAUTHORIZED, {
            params: { reason: AUTH_ERROR_REASONS.TOKEN_INVALID_OR_EXPIRED },
         });
      }
   }

   private extractToken(authHeader?: string): string | null {
      if (!authHeader) {
         return null;
      }
      if (authHeader.startsWith('Bearer ') || authHeader.startsWith('bearer ')) {
         return authHeader.slice(7).trim();
      }
      return authHeader.trim();
   }
}
