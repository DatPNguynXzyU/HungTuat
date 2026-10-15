import { Inject, Injectable } from '@nestjs/common';
import { type IDeviceInfo, type JwtPayload, RedisService, UnauthorizedException, uuidv7 } from '@common';
import { AUTH_ERROR_CODES, JWT_TOKEN_TYPE } from '@contracts/auth';
import { SESSION_REPOSITORY, type ISessionRepository } from '@auth/repositories';
import { AuthRedisKeys, TOKEN_REVOCATION_VALUE } from '@auth/constants';
import type {
   IJwtService,
   ITokenAccountPayload,
   ITokenLifecycleService,
   TokenPair,
} from '@auth/services/infrastructure/token.service.interface';
import { JWT_SERVICE } from '@auth/services/infrastructure/token.service.interface';

@Injectable()
export class TokenLifecycleService implements ITokenLifecycleService {
   constructor(
      @Inject(JWT_SERVICE)
      private readonly jwtService: IJwtService,
      private readonly redisService: RedisService,
      @Inject(SESSION_REPOSITORY)
      private readonly sessionRepository: ISessionRepository,
   ) {}

   async generateTokenPair(account: ITokenAccountPayload, deviceInfo?: IDeviceInfo): Promise<TokenPair> {
      const [accessTokenJti, refreshTokenJti] = [uuidv7(), uuidv7()];

      const accessToken = this.jwtService.sign(
         {
            sub: account.id,
            email: account.email,
            roles: account.roles,
            tokenType: JWT_TOKEN_TYPE.ACCESS,
            jti: accessTokenJti,
         },
         this.jwtService.accessTokenExpiresIn,
      );

      const refreshToken = this.jwtService.sign(
         {
            sub: account.id,
            email: account.email,
            roles: account.roles,
            tokenType: JWT_TOKEN_TYPE.REFRESH,
            jti: refreshTokenJti,
         },
         this.jwtService.refreshTokenExpiresIn,
      );

      const refreshRedisKey = AuthRedisKeys.refreshToken(account.id, refreshTokenJti);
      const sessionsKey = AuthRedisKeys.sessions(account.id);
      const expiresAt = new Date(Date.now() + this.jwtService.refreshTokenExpiresIn * 1000).toISOString();

      await Promise.all([
         this.redisService.setJson(
            refreshRedisKey,
            {
               accountId: account.id,
               jti: refreshTokenJti,
               createdAt: new Date().toISOString(),
            },
            this.jwtService.refreshTokenExpiresIn,
         ),
         this.redisService.sadd(sessionsKey, accessTokenJti, refreshTokenJti),
         this.redisService.expire(sessionsKey, this.jwtService.refreshTokenExpiresIn),
         this.sessionRepository.createSession({
            accountId: account.id,
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
            deviceId: deviceInfo?.deviceId,
            clientType: deviceInfo?.clientType,
            appVersion: deviceInfo?.appVersion,
            expiresAt,
         }),
      ]);

      return { accessToken, refreshToken };
   }

   async rotateTokenPair(
      account: ITokenAccountPayload,
      oldRefreshTokenJti: string,
      deviceInfo?: IDeviceInfo,
      remainingTtl?: number,
   ): Promise<TokenPair> {
      const [accessTokenJti, refreshTokenJti] = [uuidv7(), uuidv7()];

      const accessToken = this.jwtService.sign(
         {
            sub: account.id,
            email: account.email,
            roles: account.roles,
            tokenType: JWT_TOKEN_TYPE.ACCESS,
            jti: accessTokenJti,
         },
         this.jwtService.accessTokenExpiresIn,
      );

      const refreshToken = this.jwtService.sign(
         {
            sub: account.id,
            email: account.email,
            roles: account.roles,
            tokenType: JWT_TOKEN_TYPE.REFRESH,
            jti: refreshTokenJti,
         },
         this.jwtService.refreshTokenExpiresIn,
      );

      const refreshRedisKey = AuthRedisKeys.refreshToken(account.id, refreshTokenJti);
      const sessionsKey = AuthRedisKeys.sessions(account.id);
      const expiresAt = new Date(Date.now() + this.jwtService.refreshTokenExpiresIn * 1000).toISOString();
      const nowIso = new Date().toISOString();

      // Invalidate old refresh token in Redis
      await this.invalidateRefreshToken(account.id, oldRefreshTokenJti, remainingTtl);

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
            accountId: account.id,
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
            deviceId: deviceInfo?.deviceId,
            clientType: deviceInfo?.clientType,
            appVersion: deviceInfo?.appVersion,
            expiresAt,
         });
      }

      await Promise.all([
         this.redisService.setJson(
            refreshRedisKey,
            {
               accountId: account.id,
               jti: refreshTokenJti,
               createdAt: nowIso,
            },
            this.jwtService.refreshTokenExpiresIn,
         ),
         this.redisService.sadd(sessionsKey, accessTokenJti, refreshTokenJti),
         this.redisService.expire(sessionsKey, this.jwtService.refreshTokenExpiresIn),
      ]);

      return { accessToken, refreshToken };
   }

   async validateAccessToken(token: string): Promise<JwtPayload> {
      let payload: JwtPayload;
      try {
         payload = this.jwtService.verify(token);
      } catch {
         throw new UnauthorizedException(AUTH_ERROR_CODES.TOKEN_INVALID_OR_EXPIRED);
      }

      if (payload.tokenType !== JWT_TOKEN_TYPE.ACCESS) {
         throw new UnauthorizedException(AUTH_ERROR_CODES.TOKEN_INVALID_OR_EXPIRED);
      }

      if (payload.jti) {
         const isRevoked = await this.isTokenRevoked(payload.jti);
         if (isRevoked) {
            throw new UnauthorizedException(AUTH_ERROR_CODES.TOKEN_REVOKED);
         }
      }

      if (payload.sub && payload.iat) {
         const accountRevokedAtKey = AuthRedisKeys.accountRevokedAt(payload.sub);
         const revokedAt = await this.redisService.get(accountRevokedAtKey);
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
         payload = this.jwtService.verify(token);
      } catch {
         throw new UnauthorizedException(AUTH_ERROR_CODES.REFRESH_TOKEN_INVALID);
      }

      if (payload.tokenType !== JWT_TOKEN_TYPE.REFRESH) {
         throw new UnauthorizedException(AUTH_ERROR_CODES.REFRESH_TOKEN_INVALID);
      }

      if (!payload.jti || !payload.sub) {
         throw new UnauthorizedException(AUTH_ERROR_CODES.REFRESH_TOKEN_INVALID);
      }

      const isRevoked = await this.isTokenRevoked(payload.jti);
      if (isRevoked) {
         // Token reuse detected: Revoke all active sessions for this user to mitigate breach
         await this.revokeAllAccountTokens(payload.sub);
         throw new UnauthorizedException(AUTH_ERROR_CODES.REFRESH_TOKEN_REVOKED);
      }

      const activeKey = AuthRedisKeys.refreshToken(payload.sub, payload.jti);
      const activeToken = await this.redisService.getJson(activeKey);
      if (!activeToken) {
         // Token reuse detected or not active: Revoke all active sessions for this user
         await this.revokeAllAccountTokens(payload.sub);
         throw new UnauthorizedException(AUTH_ERROR_CODES.REFRESH_TOKEN_REVOKED);
      }

      return payload;
   }

   async isTokenRevoked(jti: string): Promise<boolean> {
      const revokedKey = AuthRedisKeys.revokedToken(jti);
      const revoked = await this.redisService.get(revokedKey);
      return Boolean(revoked);
   }

   async invalidateRefreshToken(accountId: string, jti: string, remainingTtl?: number): Promise<void> {
      const activeKey = AuthRedisKeys.refreshToken(accountId, jti);
      const sessionsKey = AuthRedisKeys.sessions(accountId);
      const revokedKey = AuthRedisKeys.revokedToken(jti);
      const ttl =
         typeof remainingTtl === 'number' && remainingTtl > 0 ? remainingTtl : this.jwtService.refreshTokenExpiresIn;

      await Promise.all([
         this.redisService.del(activeKey),
         this.redisService.srem(sessionsKey, jti),
         this.redisService.set(revokedKey, TOKEN_REVOCATION_VALUE, ttl),
         this.sessionRepository.updateSessionByJti(jti, { isRevoked: true }),
      ]);
   }

   async revokeAllAccountTokens(accountId: string): Promise<void> {
      if (!accountId) {
         return;
      }
      const nowInSeconds = Math.floor(Date.now() / 1000);
      const sessionsKey = AuthRedisKeys.sessions(accountId);
      const accountRevokedAtKey = AuthRedisKeys.accountRevokedAt(accountId);
      const activeJtis = await this.redisService.smembers(sessionsKey);

      const delPromises: Promise<unknown>[] = [
         this.redisService.del(sessionsKey),
         this.redisService.set(accountRevokedAtKey, String(nowInSeconds), this.jwtService.refreshTokenExpiresIn),
         this.sessionRepository.revokeAllSessions(accountId),
      ];

      for (const jti of activeJtis) {
         const activeKey = AuthRedisKeys.refreshToken(accountId, jti);
         const revokedKey = AuthRedisKeys.revokedToken(jti);
         delPromises.push(
            this.redisService.del(activeKey),
            this.redisService.set(revokedKey, TOKEN_REVOCATION_VALUE, this.jwtService.refreshTokenExpiresIn),
         );
      }

      delPromises.push(this.redisService.deleteByPattern(AuthRedisKeys.refreshTokenPattern(accountId)));

      await Promise.all(delPromises);
   }

   async logoutAll(accountId: string): Promise<void> {
      await this.revokeAllAccountTokens(accountId);
   }

   async revokeToken(token: string): Promise<void> {
      if (!token) {
         return;
      }

      let payload: JwtPayload;
      try {
         payload = this.jwtService.verify(token);
      } catch {
         throw new UnauthorizedException(AUTH_ERROR_CODES.TOKEN_INVALID_OR_EXPIRED);
      }

      if (payload.jti && payload.sub) {
         const nowInSeconds = Math.floor(Date.now() / 1000);
         const remainingTtl = payload.exp
            ? Math.max(payload.exp - nowInSeconds, 0)
            : this.jwtService.refreshTokenExpiresIn;
         await this.invalidateRefreshToken(payload.sub, payload.jti, remainingTtl);
      }
   }
}
