import { Injectable } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';
import {
   IRevokeTokenResult,
   JwtPayload,
   JwtUtil,
   REDIS_KEY_PREFIX,
   RedisService,
   UnauthorizedException,
} from '@common';
import { AuthConfigService } from '@auth/config';
import { AUTH_ERROR_CODES } from '@auth/constants/auth-error-codes';

export interface TokenPair {
   accessToken: string;
   refreshToken: string;
}

export type RevokeTokenResult = IRevokeTokenResult;

@Injectable()
export class TokenService {
   private readonly jwtSecret: string;
   private readonly jwtRefreshSecret: string;
   private readonly accessTokenExpiresIn: number;
   private readonly refreshTokenExpiresIn: number;

   constructor(
      private readonly config: AuthConfigService,
      private readonly redisService: RedisService,
   ) {
      this.jwtSecret = this.config.jwtSecret;
      this.jwtRefreshSecret = this.config.jwtRefreshSecret || this.config.jwtSecret;
      this.accessTokenExpiresIn = this.config.jwtAccessTokenExpiresIn;
      this.refreshTokenExpiresIn = this.config.jwtRefreshTokenExpiresIn;
   }

   async generateTokenPair(user: {
      id: string;
      email: string;
      fullName?: string;
      roles: string[];
   }): Promise<TokenPair> {
      const jti = uuidv7();

      const accessToken = JwtUtil.sign(
         {
            sub: user.id,
            email: user.email,
            fullName: user.fullName,
            roles: user.roles,
            tokenType: 'access',
         },
         this.jwtSecret,
         this.accessTokenExpiresIn,
      );

      const refreshToken = JwtUtil.sign(
         {
            sub: user.id,
            email: user.email,
            roles: user.roles,
            tokenType: 'refresh',
            jti,
         },
         this.jwtRefreshSecret,
         this.refreshTokenExpiresIn,
      );

      const redisKey = `${REDIS_KEY_PREFIX.REFRESH_TOKEN}${user.id}:${jti}`;
      const sessionsKey = `${REDIS_KEY_PREFIX.USER_SESSIONS}${user.id}`;

      await Promise.all([
         this.redisService.setJson(
            redisKey,
            {
               userId: user.id,
               jti,
               createdAt: new Date().toISOString(),
            },
            this.refreshTokenExpiresIn,
         ),
         this.redisService.sadd(sessionsKey, jti),
         this.redisService.expire(sessionsKey, this.refreshTokenExpiresIn),
      ]);

      return { accessToken, refreshToken };
   }

   validateAccessToken(token: string): JwtPayload {
      let payload: JwtPayload;
      try {
         payload = JwtUtil.verify(token, this.jwtSecret);
      } catch {
         throw new UnauthorizedException(AUTH_ERROR_CODES.TOKEN_INVALID_OR_EXPIRED);
      }

      if (payload.tokenType !== 'access') {
         throw new UnauthorizedException(AUTH_ERROR_CODES.TOKEN_INVALID_OR_EXPIRED);
      }

      return payload;
   }

   async validateRefreshToken(token: string): Promise<JwtPayload> {
      if (!token) {
         throw new UnauthorizedException(AUTH_ERROR_CODES.REFRESH_TOKEN_REQUIRED);
      }

      let payload: JwtPayload;
      try {
         payload = JwtUtil.verify(token, this.jwtRefreshSecret);
      } catch {
         throw new UnauthorizedException(AUTH_ERROR_CODES.REFRESH_TOKEN_INVALID);
      }

      if (payload.tokenType !== 'refresh') {
         throw new UnauthorizedException(AUTH_ERROR_CODES.REFRESH_TOKEN_INVALID);
      }

      if (!payload.jti || !payload.sub) {
         throw new UnauthorizedException(AUTH_ERROR_CODES.REFRESH_TOKEN_INVALID);
      }

      const isRevoked = await this.isTokenRevoked(payload.jti);
      if (isRevoked) {
         // Token reuse detected: Revoke all active sessions for this user to mitigate breach
         await this.revokeAllUserTokens(payload.sub);
         throw new UnauthorizedException(AUTH_ERROR_CODES.REFRESH_TOKEN_REVOKED);
      }

      const activeKey = `${REDIS_KEY_PREFIX.REFRESH_TOKEN}${payload.sub}:${payload.jti}`;
      const activeToken = await this.redisService.getJson(activeKey);
      if (!activeToken) {
         // Token reuse detected or not active: Revoke all active sessions for this user
         await this.revokeAllUserTokens(payload.sub);
         throw new UnauthorizedException(AUTH_ERROR_CODES.REFRESH_TOKEN_REVOKED);
      }

      return payload;
   }

   async isTokenRevoked(jti: string): Promise<boolean> {
      const revokedKey = `${REDIS_KEY_PREFIX.REVOKED_TOKEN}${jti}`;
      const revoked = await this.redisService.get(revokedKey);
      return Boolean(revoked);
   }

   async invalidateRefreshToken(userId: string, jti: string, remainingTtl?: number): Promise<void> {
      const activeKey = `${REDIS_KEY_PREFIX.REFRESH_TOKEN}${userId}:${jti}`;
      const sessionsKey = `${REDIS_KEY_PREFIX.USER_SESSIONS}${userId}`;
      const revokedKey = `${REDIS_KEY_PREFIX.REVOKED_TOKEN}${jti}`;
      const ttl = typeof remainingTtl === 'number' && remainingTtl > 0 ? remainingTtl : this.refreshTokenExpiresIn;

      await Promise.all([
         this.redisService.del(activeKey),
         this.redisService.srem(sessionsKey, jti),
         this.redisService.set(revokedKey, 'revoked', ttl),
      ]);
   }

   async revokeAllUserTokens(userId: string): Promise<void> {
      if (!userId) {
         return;
      }
      const sessionsKey = `${REDIS_KEY_PREFIX.USER_SESSIONS}${userId}`;
      const activeJtis = await this.redisService.smembers(sessionsKey);

      const delPromises: Promise<unknown>[] = [this.redisService.del(sessionsKey)];

      for (const jti of activeJtis) {
         const activeKey = `${REDIS_KEY_PREFIX.REFRESH_TOKEN}${userId}:${jti}`;
         const revokedKey = `${REDIS_KEY_PREFIX.REVOKED_TOKEN}${jti}`;
         delPromises.push(
            this.redisService.del(activeKey),
            this.redisService.set(revokedKey, 'revoked', this.refreshTokenExpiresIn),
         );
      }

      delPromises.push(this.redisService.deleteByPattern(`${REDIS_KEY_PREFIX.REFRESH_TOKEN}${userId}:*`));

      await Promise.all(delPromises);
   }

   async logoutAll(userId: string): Promise<void> {
      await this.revokeAllUserTokens(userId);
   }

   async revokeToken(token: string): Promise<IRevokeTokenResult> {
      if (!token) {
         return { success: true, message: 'No token provided to revoke' };
      }

      let payload: JwtPayload;
      try {
         payload = JwtUtil.verify(token, this.jwtRefreshSecret);
      } catch {
         try {
            payload = JwtUtil.verify(token, this.jwtSecret);
         } catch {
            return {
               success: false,
               message: 'Invalid or expired token',
            };
         }
      }

      if (payload.jti && payload.sub) {
         const nowInSeconds = Math.floor(Date.now() / 1000);
         const remainingTtl = payload.exp ? Math.max(payload.exp - nowInSeconds, 0) : this.refreshTokenExpiresIn;
         await this.invalidateRefreshToken(payload.sub, payload.jti, remainingTtl);
      }

      return {
         success: true,
         message: 'Token revoked successfully',
      };
   }
}
