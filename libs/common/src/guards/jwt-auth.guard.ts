import { CanActivate, ExecutionContext, Injectable, Optional } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { CommonConfigService } from '@common/config/common-config.service';
import { AUTH_COOKIES, AUTH_ERROR_REASONS } from '@common/constants/auth.constant';
import { REDIS_KEY_PREFIX } from '@common/constants/redis.constant';
import { IS_PUBLIC_KEY } from '@common/decorators/public.decorator';
import { COMMON_ERROR_CODES } from '@common/exceptions/error-codes';
import { UnauthorizedException } from '@common/exceptions/http.exceptions';
import { RedisService } from '@common/redis/redis.service';
import type { JwtPayload } from '@common/utils/jwt.util';
import { JwtUtil } from '@common/utils/jwt.util';

export interface AuthenticatedRequest extends Request {
   user?: JwtPayload;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
   constructor(
      private readonly config: CommonConfigService,
      private readonly reflector: Reflector,
      @Optional() private readonly redisService?: RedisService,
   ) {}

   async canActivate(context: ExecutionContext): Promise<boolean> {
      const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
         context.getHandler(),
         context.getClass(),
      ]);

      if (isPublic) {
         const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
         const token = this.extractToken(request);
         if (token) {
            try {
               const payload = JwtUtil.verify(token, this.config.jwtPublicKey);
               if (!payload.tokenType || payload.tokenType === 'access') {
                  request.user = payload;
               }
            } catch {
               // Silently ignore invalid or expired tokens on public routes
            }
         }
         return true;
      }

      const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
      const token = this.extractToken(request);

      if (!token) {
         throw new UnauthorizedException(COMMON_ERROR_CODES.UNAUTHORIZED, {
            params: { reason: AUTH_ERROR_REASONS.TOKEN_MISSING },
         });
      }

      try {
         const payload = JwtUtil.verify(token, this.config.jwtPublicKey);
         if (payload.tokenType && payload.tokenType !== 'access') {
            throw new UnauthorizedException(COMMON_ERROR_CODES.UNAUTHORIZED, {
               params: { reason: AUTH_ERROR_REASONS.INVALID_TOKEN_TYPE },
            });
         }

         if (this.redisService) {
            if (payload.jti) {
               const revokedKey = `${REDIS_KEY_PREFIX.REVOKED_TOKEN}${payload.jti}`;
               const isBlacklisted = await this.redisService.get(revokedKey);
               if (isBlacklisted) {
                  throw new UnauthorizedException(COMMON_ERROR_CODES.UNAUTHORIZED, {
                     params: { reason: AUTH_ERROR_REASONS.TOKEN_REVOKED },
                  });
               }
            }

            if (payload.sub) {
               const userRevokedAtKey = `${REDIS_KEY_PREFIX.USER_REVOKED_AT}${payload.sub}`;
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

         request.user = payload;
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

   private extractToken(request: AuthenticatedRequest): string | null {
      const cookies = request.cookies as Record<string, string> | undefined;

      if (cookies) {
         const customCookieName = this.config.accessTokenCookieName;
         if (customCookieName && cookies[customCookieName]) {
            return cookies[customCookieName];
         }
         if (cookies[AUTH_COOKIES.ACCESS_TOKEN]) {
            return cookies[AUTH_COOKIES.ACCESS_TOKEN];
         }
         if (cookies['jwt']) {
            return cookies['jwt'];
         }
      }

      const authHeader = request.headers?.authorization;
      if (authHeader) {
         const [scheme, token] = authHeader.split(' ');
         if (scheme && scheme.toLowerCase() === 'bearer' && token) {
            return token.trim();
         }
      }

      return null;
   }
}
