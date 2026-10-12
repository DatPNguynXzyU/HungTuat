import { Inject, Injectable } from '@nestjs/common';
import { uuidv7 } from '@common';
import {
   AUTH_ERROR_CODES,
   IDeviceInfo,
   IJwksResponse,
   IRevokeSessionResult,
   IRevokeTokenResult,
   ITokenAccountPayload,
   IUserSessionInfo,
   JWT_TOKEN_TYPE,
   JwtPayload,
   JwtUtil,
   NotFoundException,
   REDIS_KEY_PREFIX,
   REDIS_TTL,
   RedisService,
   UnauthorizedException,
} from '@common';
import { AuthConfigService } from '@auth/config';
import type { SessionEntity } from '@auth/entities/session.entity';
import type { ISessionRepository } from '@auth/repositories/session.repository.interface';
import { SESSION_REPOSITORY } from '@auth/repositories/session.repository.interface';
import type { ITokenService } from './token.service.interface';

export interface TokenPair {
   accessToken: string;
   refreshToken: string;
}

export type RevokeTokenResult = IRevokeTokenResult;

// Verification Token Prefix - Centralized constant
export const VERIFICATION_TOKEN_PREFIX = 'vtok_';

@Injectable()
export class TokenService implements ITokenService {
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

   /**
    * Generate a single-use verification token for OTP flow
    * @param email - User email to associate with the token
    * @param ttl - Time-to-live in seconds (defaults to OTP_VERIFICATION_TOKEN TTL)
    * @returns Verification token string with prefix
    */
   async generateVerificationToken(email: string, ttl: number = REDIS_TTL.OTP_VERIFICATION_TOKEN): Promise<string> {
      const verificationToken = `${VERIFICATION_TOKEN_PREFIX}${uuidv7().replace(/-/g, '')}`;
      const tokenKey = `${REDIS_KEY_PREFIX.OTP_VERIFICATION_TOKEN}${verificationToken}`;

      await this.redisService.set(tokenKey, email, ttl);

      return verificationToken;
   }

   /**
    * Validate a verification token and return associated email
    * @param token - Verification token to validate
    * @returns Email if valid, null if not found or expired
    */
   async validateVerificationToken(token: string): Promise<string | null> {
      const tokenKey = `${REDIS_KEY_PREFIX.OTP_VERIFICATION_TOKEN}${token}`;
      const email = await this.redisService.get(tokenKey);
      return email;
   }

   /**
    * Consume a verification token (validate and delete)
    * @param token - Verification token to consume
    * @returns Email if valid, null if not found or expired
    */
   async consumeVerificationToken(token: string): Promise<string | null> {
      const tokenKey = `${REDIS_KEY_PREFIX.OTP_VERIFICATION_TOKEN}${token}`;
      const email = await this.redisService.get(tokenKey);
      if (email) {
         await this.redisService.del(tokenKey);
      }
      return email;
   }

   async generateTokenPair(account: ITokenAccountPayload, deviceInfo?: IDeviceInfo): Promise<TokenPair> {
      const [accessTokenJti, refreshTokenJti] = [uuidv7(), uuidv7()];

      const accessToken = JwtUtil.sign(
         {
            sub: account.id,
            email: account.email,
            roles: account.roles,
            tokenType: JWT_TOKEN_TYPE.ACCESS,
            jti: accessTokenJti,
         },
         this.jwtPrivateKey,
         this.accessTokenExpiresIn,
         { keyid: this.jwtKeyId },
      );

      const refreshToken = JwtUtil.sign(
         {
            sub: account.id,
            email: account.email,
            roles: account.roles,
            tokenType: JWT_TOKEN_TYPE.REFRESH,
            jti: refreshTokenJti,
         },
         this.jwtPrivateKey,
         this.refreshTokenExpiresIn,
         { keyid: this.jwtKeyId },
      );

      const refreshRedisKey = `${REDIS_KEY_PREFIX.REFRESH_TOKEN}${account.id}:${refreshTokenJti}`;
      const sessionsKey = `${REDIS_KEY_PREFIX.ACCOUNT_SESSIONS}${account.id}`;
      const expiresAt = new Date(Date.now() + this.refreshTokenExpiresIn * 1000).toISOString();

      await Promise.all([
         this.redisService.setJson(
            refreshRedisKey,
            {
               accountId: account.id,
               jti: refreshTokenJti,
               createdAt: new Date().toISOString(),
            },
            this.refreshTokenExpiresIn,
         ),
         this.redisService.sadd(sessionsKey, accessTokenJti, refreshTokenJti),
         this.redisService.expire(sessionsKey, this.refreshTokenExpiresIn),
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

      const accessToken = JwtUtil.sign(
         {
            sub: account.id,
            email: account.email,
            roles: account.roles,
            tokenType: JWT_TOKEN_TYPE.ACCESS,
            jti: accessTokenJti,
         },
         this.jwtPrivateKey,
         this.accessTokenExpiresIn,
         { keyid: this.jwtKeyId },
      );

      const refreshToken = JwtUtil.sign(
         {
            sub: account.id,
            email: account.email,
            roles: account.roles,
            tokenType: JWT_TOKEN_TYPE.REFRESH,
            jti: refreshTokenJti,
         },
         this.jwtPrivateKey,
         this.refreshTokenExpiresIn,
         { keyid: this.jwtKeyId },
      );

      const refreshRedisKey = `${REDIS_KEY_PREFIX.REFRESH_TOKEN}${account.id}:${refreshTokenJti}`;
      const sessionsKey = `${REDIS_KEY_PREFIX.ACCOUNT_SESSIONS}${account.id}`;
      const expiresAt = new Date(Date.now() + this.refreshTokenExpiresIn * 1000).toISOString();
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
         const accountRevokedAtKey = `${REDIS_KEY_PREFIX.ACCOUNT_REVOKED_AT}${payload.sub}`;
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
         payload = JwtUtil.verify(token, this.jwtPublicKey);
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

      const activeKey = `${REDIS_KEY_PREFIX.REFRESH_TOKEN}${payload.sub}:${payload.jti}`;
      const activeToken = await this.redisService.getJson(activeKey);
      if (!activeToken) {
         // Token reuse detected or not active: Revoke all active sessions for this user
         await this.revokeAllAccountTokens(payload.sub);
         throw new UnauthorizedException(AUTH_ERROR_CODES.REFRESH_TOKEN_REVOKED);
      }

      return payload;
   }

   async isTokenRevoked(jti: string): Promise<boolean> {
      const revokedKey = `${REDIS_KEY_PREFIX.REVOKED_TOKEN}${jti}`;
      const revoked = await this.redisService.get(revokedKey);
      return Boolean(revoked);
   }

   async invalidateRefreshToken(accountId: string, jti: string, remainingTtl?: number): Promise<void> {
      const activeKey = `${REDIS_KEY_PREFIX.REFRESH_TOKEN}${accountId}:${jti}`;
      const sessionsKey = `${REDIS_KEY_PREFIX.ACCOUNT_SESSIONS}${accountId}`;
      const revokedKey = `${REDIS_KEY_PREFIX.REVOKED_TOKEN}${jti}`;
      const ttl = typeof remainingTtl === 'number' && remainingTtl > 0 ? remainingTtl : this.refreshTokenExpiresIn;

      await Promise.all([
         this.redisService.del(activeKey),
         this.redisService.srem(sessionsKey, jti),
         this.redisService.set(revokedKey, 'revoked', ttl),
         this.sessionRepository.updateSessionByJti(jti, { isRevoked: true }),
      ]);
   }

   async revokeAllAccountTokens(accountId: string): Promise<void> {
      if (!accountId) {
         return;
      }
      const nowInSeconds = Math.floor(Date.now() / 1000);
      const sessionsKey = `${REDIS_KEY_PREFIX.ACCOUNT_SESSIONS}${accountId}`;
      const accountRevokedAtKey = `${REDIS_KEY_PREFIX.ACCOUNT_REVOKED_AT}${accountId}`;
      const activeJtis = await this.redisService.smembers(sessionsKey);

      const delPromises: Promise<unknown>[] = [
         this.redisService.del(sessionsKey),
         this.redisService.set(accountRevokedAtKey, String(nowInSeconds), this.refreshTokenExpiresIn),
         this.sessionRepository.revokeAllSessions(accountId),
      ];

      for (const jti of activeJtis) {
         const activeKey = `${REDIS_KEY_PREFIX.REFRESH_TOKEN}${accountId}:${jti}`;
         const revokedKey = `${REDIS_KEY_PREFIX.REVOKED_TOKEN}${jti}`;
         delPromises.push(
            this.redisService.del(activeKey),
            this.redisService.set(revokedKey, 'revoked', this.refreshTokenExpiresIn),
         );
      }

      delPromises.push(this.redisService.deleteByPattern(`${REDIS_KEY_PREFIX.REFRESH_TOKEN}${accountId}:*`));

      await Promise.all(delPromises);
   }

   async logoutAll(accountId: string): Promise<void> {
      await this.revokeAllAccountTokens(accountId);
   }

   async getActiveSessions(accountId: string, currentJti?: string): Promise<IUserSessionInfo[]> {
      const sessions: SessionEntity[] = (await this.sessionRepository.findActiveSessionsByAccountId(accountId)) || [];
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

   async revokeSession(accountId: string, sessionId: string): Promise<void> {
      const session: SessionEntity | null = await this.sessionRepository.findById(sessionId);
      if (!session || session.accountId !== accountId) {
         throw new NotFoundException(AUTH_ERROR_CODES.SESSION_NOT_FOUND);
      }

      if (session.isRevoked) {
         return;
      }

      await this.sessionRepository.revokeSession(sessionId, accountId);
      await this.invalidateRefreshToken(accountId, session.refreshTokenJti);
   }

   async revokeOtherSessions(accountId: string, currentJti: string): Promise<IRevokeSessionResult> {
      const revokedJtisResult: unknown = await this.sessionRepository.revokeOtherSessions(accountId, currentJti);
      const revokedJtis: string[] = Array.isArray(revokedJtisResult) ? (revokedJtisResult as string[]) : [];

      const promises: Promise<unknown>[] = [];
      for (const jti of revokedJtis) {
         const activeKey = `${REDIS_KEY_PREFIX.REFRESH_TOKEN}${accountId}:${jti}`;
         const revokedKey = `${REDIS_KEY_PREFIX.REVOKED_TOKEN}${jti}`;
         const sessionsKey = `${REDIS_KEY_PREFIX.ACCOUNT_SESSIONS}${accountId}`;
         promises.push(
            this.redisService.del(activeKey),
            this.redisService.srem(sessionsKey, jti),
            this.redisService.set(revokedKey, 'revoked', this.refreshTokenExpiresIn),
         );
      }

      await Promise.all(promises);

      return {
         revokedCount: revokedJtis.length,
      };
   }

   async revokeToken(token: string): Promise<void> {
      if (!token) {
         return;
      }

      let payload: JwtPayload;
      try {
         payload = JwtUtil.verify(token, this.jwtPublicKey);
      } catch {
         throw new UnauthorizedException(AUTH_ERROR_CODES.TOKEN_INVALID_OR_EXPIRED);
      }

      if (payload.jti && payload.sub) {
         const nowInSeconds = Math.floor(Date.now() / 1000);
         const remainingTtl = payload.exp ? Math.max(payload.exp - nowInSeconds, 0) : this.refreshTokenExpiresIn;
         await this.invalidateRefreshToken(payload.sub, payload.jti, remainingTtl);
      }
   }
}
