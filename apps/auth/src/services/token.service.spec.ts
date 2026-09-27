import { Test, TestingModule } from '@nestjs/testing';
import { JwtUtil, REDIS_KEY_PREFIX, RedisService, UnauthorizedException } from '@common';
import { AuthConfigService } from '@auth/config';
import { AUTH_ERROR_CODES } from '@auth/constants/auth-error-codes';
import { TokenService } from '@auth/services/token.service';

describe('TokenService', () => {
   let service: TokenService;

   const mockRedisService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      sadd: jest.fn(),
      srem: jest.fn(),
      smembers: jest.fn(),
      expire: jest.fn(),
      deleteByPattern: jest.fn(),
      getJson: jest.fn(),
      setJson: jest.fn(),
   };

   const mockConfigService = {
      jwtSecret: 'test-access-token-secret-key',
      jwtRefreshSecret: 'test-refresh-token-secret-key',
      jwtAccessTokenExpiresIn: 900,
      jwtRefreshTokenExpiresIn: 604800,
   };

   beforeEach(async () => {
      jest.clearAllMocks();
      mockRedisService.smembers.mockResolvedValue([]);

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            TokenService,
            {
               provide: AuthConfigService,
               useValue: mockConfigService,
            },
            {
               provide: RedisService,
               useValue: mockRedisService,
            },
         ],
      }).compile();

      service = module.get<TokenService>(TokenService);
   });

   describe('generateTokenPair', () => {
      it('should generate a pair of access and refresh tokens, save refresh token whitelist and add jti to user session set in Redis', async () => {
         const user = {
            id: 'user-id-1',
            email: 'test@example.com',
            fullName: 'Test User',
            roles: ['USER'],
         };

         const tokens = await service.generateTokenPair(user);

         expect(tokens.accessToken).toBeDefined();
         expect(tokens.refreshToken).toBeDefined();

         // Redis whitelist verification
         expect(mockRedisService.setJson).toHaveBeenCalledWith(
            expect.stringContaining(`${REDIS_KEY_PREFIX.REFRESH_TOKEN}user-id-1:`),
            expect.objectContaining({ userId: 'user-id-1' }),
            mockConfigService.jwtRefreshTokenExpiresIn,
         );

         // Redis session set verification
         expect(mockRedisService.sadd).toHaveBeenCalledWith(
            `${REDIS_KEY_PREFIX.USER_SESSIONS}user-id-1`,
            expect.any(String),
         );
         expect(mockRedisService.expire).toHaveBeenCalledWith(
            `${REDIS_KEY_PREFIX.USER_SESSIONS}user-id-1`,
            mockConfigService.jwtRefreshTokenExpiresIn,
         );

         // Access token signature verified with access secret
         const accessPayload = JwtUtil.verify(tokens.accessToken, mockConfigService.jwtSecret);
         expect(accessPayload.sub).toBe('user-id-1');
         expect(accessPayload.tokenType).toBe('access');

         // Access token fails verification against refresh secret
         expect(() => JwtUtil.verify(tokens.accessToken, mockConfigService.jwtRefreshSecret)).toThrow();

         // Refresh token signature verified with refresh secret
         const refreshPayload = JwtUtil.verify(tokens.refreshToken, mockConfigService.jwtRefreshSecret);
         expect(refreshPayload.sub).toBe('user-id-1');
         expect(refreshPayload.tokenType).toBe('refresh');
         expect(refreshPayload.jti).toBeDefined();

         // Refresh token fails verification against access secret
         expect(() => JwtUtil.verify(tokens.refreshToken, mockConfigService.jwtSecret)).toThrow();
      });
   });

   describe('validateAccessToken', () => {
      it('should validate a valid access token successfully', () => {
         const token = JwtUtil.sign(
            { sub: 'user-1', email: 'user@example.com', tokenType: 'access' },
            mockConfigService.jwtSecret,
            900,
         );

         const payload = service.validateAccessToken(token);
         expect(payload.sub).toBe('user-1');
         expect(payload.tokenType).toBe('access');
      });

      it('should throw UnauthorizedException if access token is signed with wrong secret', () => {
         const token = JwtUtil.sign(
            { sub: 'user-1', email: 'user@example.com', tokenType: 'access' },
            mockConfigService.jwtRefreshSecret,
            900,
         );

         expect(() => service.validateAccessToken(token)).toThrow(UnauthorizedException);
         try {
            service.validateAccessToken(token);
         } catch (err) {
            expect((err as UnauthorizedException).errorCode).toBe(AUTH_ERROR_CODES.TOKEN_INVALID_OR_EXPIRED);
         }
      });

      it('should throw UnauthorizedException if access token is missing tokenType field', () => {
         const token = JwtUtil.sign({ sub: 'user-1', email: 'user@example.com' }, mockConfigService.jwtSecret, 900);

         expect(() => service.validateAccessToken(token)).toThrow(UnauthorizedException);
         try {
            service.validateAccessToken(token);
         } catch (err) {
            expect((err as UnauthorizedException).errorCode).toBe(AUTH_ERROR_CODES.TOKEN_INVALID_OR_EXPIRED);
         }
      });

      it('should throw UnauthorizedException if tokenType is refresh instead of access', () => {
         const token = JwtUtil.sign(
            { sub: 'user-1', email: 'user@example.com', tokenType: 'refresh' },
            mockConfigService.jwtSecret,
            900,
         );

         expect(() => service.validateAccessToken(token)).toThrow(UnauthorizedException);
         try {
            service.validateAccessToken(token);
         } catch (err) {
            expect((err as UnauthorizedException).errorCode).toBe(AUTH_ERROR_CODES.TOKEN_INVALID_OR_EXPIRED);
         }
      });

      it('should throw UnauthorizedException if token is invalid or expired', () => {
         expect(() => service.validateAccessToken('invalid.token.string')).toThrow(UnauthorizedException);
      });
   });

   describe('validateRefreshToken', () => {
      it('should validate active refresh token in whitelist', async () => {
         const token = JwtUtil.sign(
            { sub: 'user-1', email: 'user@example.com', tokenType: 'refresh', jti: 'jti-123' },
            mockConfigService.jwtRefreshSecret,
            604800,
         );

         mockRedisService.get.mockResolvedValue(null); // not revoked in blacklist
         mockRedisService.getJson.mockResolvedValue({ userId: 'user-1', jti: 'jti-123' }); // active in whitelist

         const payload = await service.validateRefreshToken(token);
         expect(payload.sub).toBe('user-1');
         expect(payload.jti).toBe('jti-123');
         expect(mockRedisService.getJson).toHaveBeenCalledWith(`${REDIS_KEY_PREFIX.REFRESH_TOKEN}user-1:jti-123`);
      });

      it('should throw UnauthorizedException if refresh token is empty or missing', async () => {
         await expect(service.validateRefreshToken('')).rejects.toThrow(UnauthorizedException);
      });

      it('should throw UnauthorizedException if refresh token is signed with wrong secret', async () => {
         const token = JwtUtil.sign(
            { sub: 'user-1', email: 'user@example.com', tokenType: 'refresh', jti: 'jti-123' },
            mockConfigService.jwtSecret,
            604800,
         );

         await expect(service.validateRefreshToken(token)).rejects.toThrow(UnauthorizedException);
      });

      it('should throw UnauthorizedException if tokenType is not refresh', async () => {
         const token = JwtUtil.sign(
            { sub: 'user-1', email: 'user@example.com', tokenType: 'access', jti: 'jti-123' },
            mockConfigService.jwtRefreshSecret,
            604800,
         );

         await expect(service.validateRefreshToken(token)).rejects.toThrow(UnauthorizedException);
      });

      it('should throw UnauthorizedException if token is missing jti or sub', async () => {
         const tokenWithoutJti = JwtUtil.sign(
            { sub: 'user-1', email: 'user@example.com', tokenType: 'refresh' },
            mockConfigService.jwtRefreshSecret,
            604800,
         );

         await expect(service.validateRefreshToken(tokenWithoutJti)).rejects.toThrow(UnauthorizedException);
      });

      it('should revoke all user sessions and throw UnauthorizedException if refresh token is in blacklist (token reuse detected)', async () => {
         const token = JwtUtil.sign(
            { sub: 'user-1', email: 'user@example.com', tokenType: 'refresh', jti: 'revoked-jti' },
            mockConfigService.jwtRefreshSecret,
            604800,
         );

         mockRedisService.get.mockResolvedValue('revoked');

         await expect(service.validateRefreshToken(token)).rejects.toThrow(UnauthorizedException);
         expect(mockRedisService.deleteByPattern).toHaveBeenCalledWith(`${REDIS_KEY_PREFIX.REFRESH_TOKEN}user-1:*`);
      });

      it('should revoke all user sessions and throw UnauthorizedException if refresh token is missing from Redis whitelist (token reuse detected)', async () => {
         const token = JwtUtil.sign(
            { sub: 'user-1', email: 'user@example.com', tokenType: 'refresh', jti: 'not-found-jti' },
            mockConfigService.jwtRefreshSecret,
            604800,
         );

         mockRedisService.get.mockResolvedValue(null); // not blacklisted
         mockRedisService.getJson.mockResolvedValue(null); // not active in whitelist

         await expect(service.validateRefreshToken(token)).rejects.toThrow(UnauthorizedException);
         expect(mockRedisService.deleteByPattern).toHaveBeenCalledWith(`${REDIS_KEY_PREFIX.REFRESH_TOKEN}user-1:*`);
      });
   });

   describe('revokeAllUserTokens and logoutAll', () => {
      it('should iterate over user sessions set in Redis, delete active keys, set blacklist keys, delete set and pattern fallback', async () => {
         mockRedisService.smembers.mockResolvedValue(['jti-1', 'jti-2']);

         await service.revokeAllUserTokens('user-1');

         expect(mockRedisService.smembers).toHaveBeenCalledWith(`${REDIS_KEY_PREFIX.USER_SESSIONS}user-1`);
         expect(mockRedisService.del).toHaveBeenCalledWith(`${REDIS_KEY_PREFIX.USER_SESSIONS}user-1`);
         expect(mockRedisService.del).toHaveBeenCalledWith(`${REDIS_KEY_PREFIX.REFRESH_TOKEN}user-1:jti-1`);
         expect(mockRedisService.del).toHaveBeenCalledWith(`${REDIS_KEY_PREFIX.REFRESH_TOKEN}user-1:jti-2`);
         expect(mockRedisService.set).toHaveBeenCalledWith(
            `${REDIS_KEY_PREFIX.REVOKED_TOKEN}jti-1`,
            'revoked',
            mockConfigService.jwtRefreshTokenExpiresIn,
         );
         expect(mockRedisService.set).toHaveBeenCalledWith(
            `${REDIS_KEY_PREFIX.REVOKED_TOKEN}jti-2`,
            'revoked',
            mockConfigService.jwtRefreshTokenExpiresIn,
         );
         expect(mockRedisService.deleteByPattern).toHaveBeenCalledWith(`${REDIS_KEY_PREFIX.REFRESH_TOKEN}user-1:*`);
      });

      it('should delegate logoutAll to revokeAllUserTokens', async () => {
         mockRedisService.smembers.mockResolvedValue(['jti-1']);

         await service.logoutAll('user-1');

         expect(mockRedisService.smembers).toHaveBeenCalledWith(`${REDIS_KEY_PREFIX.USER_SESSIONS}user-1`);
         expect(mockRedisService.del).toHaveBeenCalledWith(`${REDIS_KEY_PREFIX.USER_SESSIONS}user-1`);
      });

      it('should do nothing if userId is empty', async () => {
         await service.revokeAllUserTokens('');

         expect(mockRedisService.smembers).not.toHaveBeenCalled();
      });
   });

   describe('invalidateRefreshToken', () => {
      it('should delete active key from whitelist, remove jti from session set and set blacklist key with remaining TTL', async () => {
         await service.invalidateRefreshToken('user-1', 'jti-abc', 300);

         expect(mockRedisService.del).toHaveBeenCalledWith(`${REDIS_KEY_PREFIX.REFRESH_TOKEN}user-1:jti-abc`);
         expect(mockRedisService.srem).toHaveBeenCalledWith(`${REDIS_KEY_PREFIX.USER_SESSIONS}user-1`, 'jti-abc');
         expect(mockRedisService.set).toHaveBeenCalledWith(`${REDIS_KEY_PREFIX.REVOKED_TOKEN}jti-abc`, 'revoked', 300);
      });

      it('should use default refreshTokenExpiresIn if remainingTtl is not provided or non-positive', async () => {
         await service.invalidateRefreshToken('user-1', 'jti-abc');

         expect(mockRedisService.del).toHaveBeenCalledWith(`${REDIS_KEY_PREFIX.REFRESH_TOKEN}user-1:jti-abc`);
         expect(mockRedisService.srem).toHaveBeenCalledWith(`${REDIS_KEY_PREFIX.USER_SESSIONS}user-1`, 'jti-abc');
         expect(mockRedisService.set).toHaveBeenCalledWith(
            `${REDIS_KEY_PREFIX.REVOKED_TOKEN}jti-abc`,
            'revoked',
            mockConfigService.jwtRefreshTokenExpiresIn,
         );
      });
   });

   describe('revokeToken', () => {
      it('should return success when no token is provided', async () => {
         const res = await service.revokeToken('');
         expect(res.success).toBe(true);
         expect(res.message).toBe('No token provided to revoke');
      });

      it('should return failure if token is forged or invalid signature', async () => {
         const forgedToken = JwtUtil.sign(
            { sub: 'victim-id', tokenType: 'refresh', jti: 'victim-jti' },
            'attacker-fake-secret',
            604800,
         );

         const res = await service.revokeToken(forgedToken);
         expect(res.success).toBe(false);
         expect(res.message).toBe('Invalid or expired token');
         expect(mockRedisService.del).not.toHaveBeenCalled();
         expect(mockRedisService.set).not.toHaveBeenCalled();
      });

      it('should successfully verify and revoke valid refresh token with accurate remaining TTL', async () => {
         const token = JwtUtil.sign(
            { sub: 'user-1', email: 'user@example.com', tokenType: 'refresh', jti: 'to-revoke-jti' },
            mockConfigService.jwtRefreshSecret,
            3600,
         );

         const res = await service.revokeToken(token);
         expect(res.success).toBe(true);
         expect(mockRedisService.del).toHaveBeenCalledWith(`${REDIS_KEY_PREFIX.REFRESH_TOKEN}user-1:to-revoke-jti`);
         expect(mockRedisService.srem).toHaveBeenCalledWith(`${REDIS_KEY_PREFIX.USER_SESSIONS}user-1`, 'to-revoke-jti');
         expect(mockRedisService.set).toHaveBeenCalledWith(
            `${REDIS_KEY_PREFIX.REVOKED_TOKEN}to-revoke-jti`,
            'revoked',
            expect.any(Number),
         );
      });
   });
});
