import { Inject, Injectable } from '@nestjs/common';
import { type IDeviceInfo, type JwtPayload, RedisService, UnauthorizedException, uuidv7 } from '@common';
import { AUTH_ERROR_CODES, JWT_TOKEN_TYPE } from '@contracts/auth';
import { AuthRedisKeys, TOKEN_REVOCATION_VALUE } from '@auth/constants';
import { SESSION_REPOSITORY, type ISessionRepository } from '@auth/repositories';
import { AuthConfigService } from '@auth/config';
import { OpaqueTokenUtil } from '@auth/utils';
import type {
   IJwtService,
   ITokenAccountPayload,
   ITokenLifecycleService,
   TokenPair,
} from '@auth/services/infrastructure/token.service.interface';
import { JWT_SERVICE } from '@auth/services/infrastructure/token.service.interface';

interface IRefreshTokenCacheData {
   accountId: string;
   email?: string;
   roles?: string[];
   jti: string;
   hash: string;
   createdAt: string;
   expiresAt: string;
}

@Injectable()
export class TokenLifecycleService implements ITokenLifecycleService {
   constructor(
      @Inject(JWT_SERVICE)
      private readonly jwtService: IJwtService,
      private readonly redisService: RedisService,
      @Inject(SESSION_REPOSITORY)
      private readonly sessionRepository: ISessionRepository,
      private readonly configService: AuthConfigService,
   ) {}

   async generateTokenPair(account: ITokenAccountPayload, deviceInfo?: IDeviceInfo): Promise<TokenPair> {
      const accessTokenJti = uuidv7();
      const refreshTokenJti = uuidv7();
      const secret = OpaqueTokenUtil.generateSecret();
      const hash = OpaqueTokenUtil.hashSecret(secret, this.configService.refreshTokenSecret);
      const refreshToken = OpaqueTokenUtil.format(refreshTokenJti, secret);

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

      const refreshRedisKey = AuthRedisKeys.refreshToken(account.id, refreshTokenJti);
      const refreshJtiKey = AuthRedisKeys.refreshTokenByJti(refreshTokenJti);
      const sessionsKey = AuthRedisKeys.sessions(account.id);
      const nowIso = new Date().toISOString();
      const expiresAt = new Date(Date.now() + this.jwtService.refreshTokenExpiresIn * 1000).toISOString();

      const sessionCacheData: IRefreshTokenCacheData = {
         accountId: account.id,
         email: account.email,
         roles: account.roles,
         jti: refreshTokenJti,
         hash,
         createdAt: nowIso,
         expiresAt,
      };

      await Promise.all([
         this.redisService.setJson(refreshRedisKey, sessionCacheData, this.jwtService.refreshTokenExpiresIn),
         this.redisService.setJson(refreshJtiKey, sessionCacheData, this.jwtService.refreshTokenExpiresIn),
         this.redisService.sadd(sessionsKey, accessTokenJti, refreshTokenJti),
         this.redisService.expire(sessionsKey, this.jwtService.refreshTokenExpiresIn),
         this.sessionRepository.createSession({
            accountId: account.id,
            refreshTokenJti,
            refreshTokenHash: hash,
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
      const accessTokenJti = uuidv7();
      const refreshTokenJti = uuidv7();
      const secret = OpaqueTokenUtil.generateSecret();
      const hash = OpaqueTokenUtil.hashSecret(secret, this.configService.refreshTokenSecret);
      const refreshToken = OpaqueTokenUtil.format(refreshTokenJti, secret);

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

      const refreshRedisKey = AuthRedisKeys.refreshToken(account.id, refreshTokenJti);
      const refreshJtiKey = AuthRedisKeys.refreshTokenByJti(refreshTokenJti);
      const sessionsKey = AuthRedisKeys.sessions(account.id);
      const expiresAt = new Date(Date.now() + this.jwtService.refreshTokenExpiresIn * 1000).toISOString();
      const nowIso = new Date().toISOString();

      // Invalidate old refresh token in Redis and blacklist old JTI
      await this.invalidateRefreshToken(account.id, oldRefreshTokenJti, remainingTtl);

      const existingSession = await this.sessionRepository.findByJti(oldRefreshTokenJti);
      if (existingSession) {
         await this.sessionRepository.updateSession(existingSession.id, {
            refreshTokenJti,
            refreshTokenHash: hash,
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
            refreshTokenHash: hash,
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

      const sessionCacheData: IRefreshTokenCacheData = {
         accountId: account.id,
         email: account.email,
         roles: account.roles,
         jti: refreshTokenJti,
         hash,
         createdAt: nowIso,
         expiresAt,
      };

      await Promise.all([
         this.redisService.setJson(refreshRedisKey, sessionCacheData, this.jwtService.refreshTokenExpiresIn),
         this.redisService.setJson(refreshJtiKey, sessionCacheData, this.jwtService.refreshTokenExpiresIn),
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

      const parsed = OpaqueTokenUtil.parse(token);
      if (!parsed) {
         throw new UnauthorizedException(AUTH_ERROR_CODES.REFRESH_TOKEN_INVALID);
      }

      const { jti, secret } = parsed;

      const isRevoked = await this.isTokenRevoked(jti);
      if (isRevoked) {
         // Token reuse detected: Revoke all active sessions for this user to mitigate breach
         const session = await this.sessionRepository.findByJti(jti);
         if (session?.accountId) {
            await this.revokeAllAccountTokens(session.accountId);
         }
         throw new UnauthorizedException(AUTH_ERROR_CODES.REFRESH_TOKEN_REVOKED);
      }

      // Check Active Session in Redis by JTI O(1)
      const jtiKey = AuthRedisKeys.refreshTokenByJti(jti);
      const cached = await this.redisService.getJson<IRefreshTokenCacheData>(jtiKey);

      let accountId = cached?.accountId;
      let storedHash = cached?.hash;
      const email = cached?.email;
      const roles = cached?.roles;
      let expiresAt = cached?.expiresAt;
      let createdAt = cached?.createdAt;

      // Fallback to database
      if (!cached) {
         const dbSession = await this.sessionRepository.findByJti(jti);
         if (!dbSession) {
            throw new UnauthorizedException(AUTH_ERROR_CODES.REFRESH_TOKEN_REVOKED);
         }

         if (dbSession.isRevoked || new Date(dbSession.expiresAt).getTime() <= Date.now()) {
            await this.revokeAllAccountTokens(dbSession.accountId);
            throw new UnauthorizedException(AUTH_ERROR_CODES.REFRESH_TOKEN_REVOKED);
         }

         accountId = dbSession.accountId;
         storedHash = dbSession.refreshTokenHash ?? undefined;
         expiresAt = dbSession.expiresAt;
         createdAt = dbSession.createdAt;
      }

      if (!storedHash) {
         if (accountId) {
            await this.revokeAllAccountTokens(accountId);
         }
         throw new UnauthorizedException(AUTH_ERROR_CODES.REFRESH_TOKEN_INVALID);
      }

      const computedHash = OpaqueTokenUtil.hashSecret(secret, this.configService.refreshTokenSecret);
      const isValid = OpaqueTokenUtil.verifyHash(computedHash, storedHash);

      if (!isValid) {
         if (accountId) {
            await this.revokeAllAccountTokens(accountId);
         }
         throw new UnauthorizedException(AUTH_ERROR_CODES.REFRESH_TOKEN_INVALID);
      }

      const exp = expiresAt
         ? Math.floor(new Date(expiresAt).getTime() / 1000)
         : Math.floor(Date.now() / 1000) + this.jwtService.refreshTokenExpiresIn;

      const iat = createdAt ? Math.floor(new Date(createdAt).getTime() / 1000) : Math.floor(Date.now() / 1000);

      return {
         sub: accountId!,
         email: email || '',
         roles: roles || [],
         jti,
         tokenType: JWT_TOKEN_TYPE.REFRESH,
         iat,
         exp,
      };
   }

   async isTokenRevoked(jti: string): Promise<boolean> {
      const revokedKey = AuthRedisKeys.revokedToken(jti);
      const revoked = await this.redisService.get(revokedKey);
      return Boolean(revoked);
   }

   async invalidateRefreshToken(accountId: string, jti: string, remainingTtl?: number): Promise<void> {
      const activeKey = AuthRedisKeys.refreshToken(accountId, jti);
      const jtiKey = AuthRedisKeys.refreshTokenByJti(jti);
      const sessionsKey = AuthRedisKeys.sessions(accountId);
      const revokedKey = AuthRedisKeys.revokedToken(jti);
      const ttl =
         typeof remainingTtl === 'number' && remainingTtl > 0 ? remainingTtl : this.jwtService.refreshTokenExpiresIn;

      await Promise.all([
         this.redisService.del(activeKey),
         this.redisService.del(jtiKey),
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
         const jtiKey = AuthRedisKeys.refreshTokenByJti(jti);
         const revokedKey = AuthRedisKeys.revokedToken(jti);
         delPromises.push(
            this.redisService.del(activeKey),
            this.redisService.del(jtiKey),
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

      const parsed = OpaqueTokenUtil.parse(token);
      if (parsed) {
         const { jti } = parsed;
         let accountId: string | null = null;
         const cached = await this.redisService.getJson<IRefreshTokenCacheData>(AuthRedisKeys.refreshTokenByJti(jti));
         if (cached?.accountId) {
            accountId = cached.accountId;
         } else {
            const session = await this.sessionRepository.findByJti(jti);
            if (session?.accountId) {
               accountId = session.accountId;
            }
         }
         if (accountId) {
            await this.invalidateRefreshToken(accountId, jti);
         } else {
            await this.redisService.set(
               AuthRedisKeys.revokedToken(jti),
               TOKEN_REVOCATION_VALUE,
               this.jwtService.refreshTokenExpiresIn,
            );
         }
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
