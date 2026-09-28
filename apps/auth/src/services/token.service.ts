import { Inject, Injectable } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';
import {
   IDeviceInfo,
   IJwksResponse,
   IRevokeSessionResult,
   IRevokeTokenResult,
   IUserSessionInfo,
   JwtPayload,
   JwtUtil,
   NotFoundException,
   REDIS_KEY_PREFIX,
   RedisService,
   UnauthorizedException,
} from '@common';
import { AuthConfigService } from '@auth/config';
import { AUTH_ERROR_CODES } from '@auth/constants/auth-error-codes';
import type { UserSessionEntity } from '@auth/entities/session.entity';
import type { ISessionRepository } from '@auth/repositories/session.repository.interface';
import { SESSION_REPOSITORY } from '@auth/repositories/session.repository.interface';

export interface TokenPair {
   accessToken: string;
   refreshToken: string;
}

export type RevokeTokenResult = IRevokeTokenResult;

@Injectable()
export class TokenService {
   private readonly jwtPrivateKey: string;
   private readonly jwtPublicKey: string;
   private readonly jwtKeyId: string;
   private readonly accessTokenExpiresIn: number;
   private readonly refreshTokenExpiresIn: number;

   constructor(
      private readonly config: AuthConfigService,
      private readonly redisService: RedisService,
      @Inject(SESSION_REPOSITORY)
      private readonly sessionRepository: ISessionRepository,
   ) {
      this.jwtPrivateKey = this.config.jwtPrivateKey;
      this.jwtPublicKey = this.config.jwtPublicKey;
      this.jwtKeyId = this.config.jwtKeyId;
      this.accessTokenExpiresIn = this.config.jwtAccessTokenExpiresIn;
      this.refreshTokenExpiresIn = this.config.jwtRefreshTokenExpiresIn;
   }

   getJwks(): IJwksResponse {
      return JwtUtil.generateJwks(this.jwtPublicKey, this.jwtKeyId);
   }

   async generateTokenPair(
      user: {
         id: string;
         email: string;
         fullName?: string;
         roles: string[];
      },
      deviceInfo?: IDeviceInfo,
   ): Promise<TokenPair> {
      const accessTokenJti = uuidv7();
      const refreshTokenJti = uuidv7();

      const accessToken = JwtUtil.sign(
         {
            sub: user.id,
            email: user.email,
            fullName: user.fullName,
            roles: user.roles,
            tokenType: 'access',
            jti: accessTokenJti,
         },
         this.jwtPrivateKey,
         this.accessTokenExpiresIn,
         { keyid: this.jwtKeyId },
      );

      const refreshToken = JwtUtil.sign(
         {
            sub: user.id,
            email: user.email,
            roles: user.roles,
            tokenType: 'refresh',
            jti: refreshTokenJti,
         },
         this.jwtPrivateKey,
         this.refreshTokenExpiresIn,
         { keyid: this.jwtKeyId },
      );

      const refreshRedisKey = `${REDIS_KEY_PREFIX.REFRESH_TOKEN}${user.id}:${refreshTokenJti}`;
      const sessionsKey = `${REDIS_KEY_PREFIX.USER_SESSIONS}${user.id}`;
      const expiresAt = new Date(Date.now() + this.refreshTokenExpiresIn * 1000).toISOString();

      await Promise.all([
         this.redisService.setJson(
            refreshRedisKey,
            {
               userId: user.id,
               jti: refreshTokenJti,
               createdAt: new Date().toISOString(),
            },
            this.refreshTokenExpiresIn,
         ),
         this.redisService.sadd(sessionsKey, accessTokenJti, refreshTokenJti),
         this.redisService.expire(sessionsKey, this.refreshTokenExpiresIn),
         this.sessionRepository.createSession({
            userId: user.id,
            refreshTokenJti,
            deviceType: deviceInfo?.deviceType,
            deviceName: deviceInfo?.deviceName,
            browser: deviceInfo?.browser,
            os: deviceInfo?.os,
            userAgent: deviceInfo?.userAgent,
            ipAddress: deviceInfo?.ipAddress,
            city: deviceInfo?.city,
            region: deviceInfo?.region,
            country: deviceInfo?.country,
            countryCode: deviceInfo?.countryCode,
            expiresAt,
         }),
      ]);

      return { accessToken, refreshToken };
   }

   async rotateTokenPair(
      user: {
         id: string;
         email: string;
         fullName?: string;
         roles: string[];
      },
      oldRefreshTokenJti: string,
      deviceInfo?: IDeviceInfo,
      remainingTtl?: number,
   ): Promise<TokenPair> {
      const accessTokenJti = uuidv7();
      const refreshTokenJti = uuidv7();

      const accessToken = JwtUtil.sign(
         {
            sub: user.id,
            email: user.email,
            fullName: user.fullName,
            roles: user.roles,
            tokenType: 'access',
            jti: accessTokenJti,
         },
         this.jwtPrivateKey,
         this.accessTokenExpiresIn,
         { keyid: this.jwtKeyId },
      );

      const refreshToken = JwtUtil.sign(
         {
            sub: user.id,
            email: user.email,
            roles: user.roles,
            tokenType: 'refresh',
            jti: refreshTokenJti,
         },
         this.jwtPrivateKey,
         this.refreshTokenExpiresIn,
         { keyid: this.jwtKeyId },
      );

      const refreshRedisKey = `${REDIS_KEY_PREFIX.REFRESH_TOKEN}${user.id}:${refreshTokenJti}`;
      const sessionsKey = `${REDIS_KEY_PREFIX.USER_SESSIONS}${user.id}`;
      const expiresAt = new Date(Date.now() + this.refreshTokenExpiresIn * 1000).toISOString();
      const nowIso = new Date().toISOString();

      // Invalidate old refresh token in Redis
      await this.invalidateRefreshToken(user.id, oldRefreshTokenJti, remainingTtl);

      // Try updating existing session with new JTI and lastActiveAt; if not found, create new session
      const existingSession = await this.sessionRepository.findByJti(oldRefreshTokenJti);
      if (existingSession) {
         await this.sessionRepository.updateSession(existingSession.id, {
            refreshTokenJti,
            lastActiveAt: nowIso,
            expiresAt,
            isRevoked: false,
            ...(deviceInfo?.ipAddress ? { ipAddress: deviceInfo.ipAddress } : {}),
            ...(deviceInfo?.city ? { city: deviceInfo.city } : {}),
            ...(deviceInfo?.region ? { region: deviceInfo.region } : {}),
            ...(deviceInfo?.country ? { country: deviceInfo.country } : {}),
            ...(deviceInfo?.countryCode ? { countryCode: deviceInfo.countryCode } : {}),
         });
      } else {
         await this.sessionRepository.createSession({
            userId: user.id,
            refreshTokenJti,
            deviceType: deviceInfo?.deviceType,
            deviceName: deviceInfo?.deviceName,
            browser: deviceInfo?.browser,
            os: deviceInfo?.os,
            userAgent: deviceInfo?.userAgent,
            ipAddress: deviceInfo?.ipAddress,
            city: deviceInfo?.city,
            region: deviceInfo?.region,
            country: deviceInfo?.country,
            countryCode: deviceInfo?.countryCode,
            expiresAt,
         });
      }

      await Promise.all([
         this.redisService.setJson(
            refreshRedisKey,
            {
               userId: user.id,
               jti: refreshTokenJti,
               createdAt: nowIso,
            },
            this.refreshTokenExpiresIn,
         ),
         this.redisService.sadd(sessionsKey, accessTokenJti, refreshTokenJti),
         this.redisService.expire(sessionsKey, this.refreshTokenExpiresIn),
      ]);

      return { accessToken, refreshToken };
   }

   async validateAccessToken(token: string): Promise<JwtPayload> {
      let payload: JwtPayload;
      try {
         payload = JwtUtil.verify(token, this.jwtPublicKey);
      } catch {
         throw new UnauthorizedException(AUTH_ERROR_CODES.TOKEN_INVALID_OR_EXPIRED);
      }

      if (payload.tokenType !== 'access') {
         throw new UnauthorizedException(AUTH_ERROR_CODES.TOKEN_INVALID_OR_EXPIRED);
      }

      if (payload.jti) {
         const isRevoked = await this.isTokenRevoked(payload.jti);
         if (isRevoked) {
            throw new UnauthorizedException(AUTH_ERROR_CODES.TOKEN_REVOKED);
         }
      }

      if (payload.sub && payload.iat) {
         const userRevokedAtKey = `${REDIS_KEY_PREFIX.USER_REVOKED_AT}${payload.sub}`;
         const revokedAt = await this.redisService.get(userRevokedAtKey);
         if (revokedAt && payload.iat <= Number(revokedAt)) {
            throw new UnauthorizedException(AUTH_ERROR_CODES.TOKEN_REVOKED);
         }
      }

      return payload;
   }

   async validateRefreshToken(token: string): Promise<JwtPayload> {
      if (!token) {
         throw new UnauthorizedException(AUTH_ERROR_CODES.REFRESH_TOKEN_REQUIRED);
      }

      let payload: JwtPayload;
      try {
         payload = JwtUtil.verify(token, this.jwtPublicKey);
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
         this.sessionRepository.updateSessionByJti(jti, { isRevoked: true }),
      ]);
   }

   async revokeAllUserTokens(userId: string): Promise<void> {
      if (!userId) {
         return;
      }
      const nowInSeconds = Math.floor(Date.now() / 1000);
      const sessionsKey = `${REDIS_KEY_PREFIX.USER_SESSIONS}${userId}`;
      const userRevokedAtKey = `${REDIS_KEY_PREFIX.USER_REVOKED_AT}${userId}`;
      const activeJtis = await this.redisService.smembers(sessionsKey);

      const delPromises: Promise<unknown>[] = [
         this.redisService.del(sessionsKey),
         this.redisService.set(userRevokedAtKey, String(nowInSeconds), this.refreshTokenExpiresIn),
         this.sessionRepository.revokeAllSessions(userId),
      ];

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

   async getActiveSessions(userId: string, currentJti?: string): Promise<IUserSessionInfo[]> {
      const sessions: UserSessionEntity[] = (await this.sessionRepository.findActiveSessionsByUserId(userId)) || [];
      return sessions.map((s) => ({
         id: s.id,
         deviceType: s.deviceType,
         deviceName: s.deviceName,
         browser: s.browser,
         os: s.os,
         ipAddress: s.ipAddress,
         city: s.city,
         region: s.region,
         country: s.country,
         countryCode: s.countryCode,
         userAgent: s.userAgent,
         isCurrent: Boolean(currentJti && s.refreshTokenJti === currentJti),
         lastActiveAt: s.lastActiveAt,
         expiresAt: s.expiresAt,
         createdAt: s.createdAt,
      }));
   }

   async revokeSession(userId: string, sessionId: string): Promise<IRevokeSessionResult> {
      const session: UserSessionEntity | null = await this.sessionRepository.findById(sessionId);
      if (!session || session.userId !== userId) {
         throw new NotFoundException(AUTH_ERROR_CODES.SESSION_NOT_FOUND);
      }

      if (session.isRevoked) {
         return { success: true, message: 'Session already revoked' };
      }

      await this.sessionRepository.revokeSession(sessionId, userId);
      await this.invalidateRefreshToken(userId, session.refreshTokenJti);

      return {
         success: true,
         message: 'Session revoked successfully',
      };
   }

   async revokeOtherSessions(userId: string, currentJti: string): Promise<IRevokeSessionResult> {
      const revokedJtisResult: unknown = await this.sessionRepository.revokeOtherSessions(userId, currentJti);
      const revokedJtis: string[] = Array.isArray(revokedJtisResult) ? (revokedJtisResult as string[]) : [];

      const promises: Promise<unknown>[] = [];
      for (const jti of revokedJtis) {
         const activeKey = `${REDIS_KEY_PREFIX.REFRESH_TOKEN}${userId}:${jti}`;
         const revokedKey = `${REDIS_KEY_PREFIX.REVOKED_TOKEN}${jti}`;
         const sessionsKey = `${REDIS_KEY_PREFIX.USER_SESSIONS}${userId}`;
         promises.push(
            this.redisService.del(activeKey),
            this.redisService.srem(sessionsKey, jti),
            this.redisService.set(revokedKey, 'revoked', this.refreshTokenExpiresIn),
         );
      }

      await Promise.all(promises);

      return {
         success: true,
         message: 'All other sessions revoked successfully',
         revokedCount: revokedJtis.length,
      };
   }

   async revokeToken(token: string): Promise<IRevokeTokenResult> {
      if (!token) {
         return { success: true, message: 'No token provided to revoke' };
      }

      let payload: JwtPayload;
      try {
         payload = JwtUtil.verify(token, this.jwtPublicKey);
      } catch {
         return {
            success: false,
            message: 'Invalid or expired token',
         };
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
