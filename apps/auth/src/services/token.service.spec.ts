import { Test, TestingModule } from '@nestjs/testing';
import {
   AUTH_ERROR_CODES,
   DEFAULT_DEV_RSA_PRIVATE_KEY,
   DEFAULT_DEV_RSA_PUBLIC_KEY,
   DEFAULT_JWT_KEY_ID,
   ITokenAccountPayload,
   JWT_TOKEN_TYPE,
   JwtUtil,
   NotFoundException,
   REDIS_KEY_PREFIX,
   RedisService,
   UnauthorizedException,
} from '@common';
import { AuthConfigService } from '@auth/config';
import { SESSION_REPOSITORY } from '@auth/repositories/session.repository.interface';
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

   const mockCreateSession = jest.fn();
   const mockFindById = jest.fn();
   const mockFindByJti = jest.fn();
   const mockFindActiveSessionsByAccountId = jest.fn();
   const mockUpdateSession = jest.fn();
   const mockUpdateSessionByJti = jest.fn();
   const mockRevokeSession = jest.fn();
   const mockRevokeOtherSessions = jest.fn();
   const mockRevokeAllSessions = jest.fn();

   const mockConfigService = {
      jwtPrivateKey: DEFAULT_DEV_RSA_PRIVATE_KEY,
      jwtPublicKey: DEFAULT_DEV_RSA_PUBLIC_KEY,
      jwtKeyId: DEFAULT_JWT_KEY_ID,
      jwtAccessTokenExpiresIn: 900,
      jwtRefreshTokenExpiresIn: 604800,
   };

   beforeEach(async () => {
      jest.clearAllMocks();
      mockRedisService.smembers.mockResolvedValue([]);
      mockRedisService.get.mockResolvedValue(null);
      mockCreateSession.mockResolvedValue({ id: 'session-id-1' });
      mockRevokeAllSessions.mockResolvedValue([]);
      mockRevokeOtherSessions.mockResolvedValue([]);

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
            {
               provide: SESSION_REPOSITORY,
               useValue: {
                  createSession: mockCreateSession,
                  findById: mockFindById,
                  findByJti: mockFindByJti,
                  findActiveSessionsByAccountId: mockFindActiveSessionsByAccountId,
                  updateSession: mockUpdateSession,
                  updateSessionByJti: mockUpdateSessionByJti,
                  revokeSession: mockRevokeSession,
                  revokeOtherSessions: mockRevokeOtherSessions,
                  revokeAllSessions: mockRevokeAllSessions,
               },
            },
         ],
      }).compile();

      service = module.get<TokenService>(TokenService);
   });

   describe('getJwks', () => {
      it('should return JWKS structure containing RSA public key', () => {
         const jwks = service.getJwks();
         expect(jwks).toBeDefined();
         expect(Array.isArray(jwks.keys)).toBe(true);
         expect(jwks.keys[0].kty).toBe('RSA');
         expect(jwks.keys[0].kid).toBe(DEFAULT_JWT_KEY_ID);
         expect(jwks.keys[0].alg).toBe('RS256');
         expect(jwks.keys[0].use).toBe('sig');
      });
   });

   describe('generateTokenPair', () => {
      it('should generate a pair of access and refresh tokens signed with RS256 and create session record in DB and Redis', async () => {
         const user: ITokenAccountPayload = {
            id: 'user-id-1',
            email: 'test@example.com',
            roles: ['USER'],
         };
         const deviceInfo = {
            deviceType: 'desktop',
            deviceName: 'Chrome on macOS',
            browser: 'Chrome 122.0',
            os: 'macOS 14.3',
            ipAddress: '127.0.0.1',
         };

         const tokens = await service.generateTokenPair(user, deviceInfo);

         expect(tokens.accessToken).toBeDefined();
         expect(tokens.refreshToken).toBeDefined();

         // Redis whitelist verification
         expect(mockRedisService.setJson).toHaveBeenCalledWith(
            expect.stringContaining(`${REDIS_KEY_PREFIX.REFRESH_TOKEN}user-id-1:`),
            expect.objectContaining({ accountId: 'user-id-1' }),
            mockConfigService.jwtRefreshTokenExpiresIn,
         );

         // Redis session set verification
         expect(mockRedisService.sadd).toHaveBeenCalledWith(
            `${REDIS_KEY_PREFIX.ACCOUNT_SESSIONS}user-id-1`,
            expect.any(String),
            expect.any(String),
         );

         // DB Session repository verification
         expect(mockCreateSession).toHaveBeenCalledWith(
            expect.objectContaining({
               accountId: 'user-id-1',
               deviceType: 'desktop',
               deviceName: 'Chrome on macOS',
            }),
         );
      });
   });

   describe('rotateTokenPair', () => {
      it('should rotate token pair and update existing session record', async () => {
         const user: ITokenAccountPayload = {
            id: 'user-id-1',
            email: 'test@example.com',
            roles: ['USER'],
         };

         mockFindByJti.mockResolvedValue({
            id: 'session-id-1',
            accountId: 'user-id-1',
            refreshTokenJti: 'old-jti',
         });

         const tokens = await service.rotateTokenPair(user, 'old-jti');

         expect(tokens.accessToken).toBeDefined();
         expect(tokens.refreshToken).toBeDefined();
         expect(mockUpdateSession).toHaveBeenCalledTimes(1);
         const updateCall = mockUpdateSession.mock.calls[0] as [
            string,
            { refreshTokenJti?: string; isRevoked?: boolean },
         ];
         expect(updateCall[0]).toBe('session-id-1');
         expect(typeof updateCall[1].refreshTokenJti).toBe('string');
         expect(updateCall[1].isRevoked).toBe(false);
      });
   });

   describe('getActiveSessions', () => {
      it('should return active sessions list with isCurrent marked correctly', async () => {
         mockFindActiveSessionsByAccountId.mockResolvedValue([
            {
               id: 'session-1',
               accountId: 'user-1',
               refreshTokenJti: 'current-jti',
               deviceName: 'Chrome on macOS',
               isRevoked: false,
               lastActiveAt: '2026-09-28T00:00:00.000Z',
               expiresAt: '2026-10-05T00:00:00.000Z',
               createdAt: '2026-09-28T00:00:00.000Z',
            },
            {
               id: 'session-2',
               accountId: 'user-1',
               refreshTokenJti: 'other-jti',
               deviceName: 'Safari on iPhone',
               isRevoked: false,
               lastActiveAt: '2026-09-27T00:00:00.000Z',
               expiresAt: '2026-10-04T00:00:00.000Z',
               createdAt: '2026-09-27T00:00:00.000Z',
            },
         ]);

         const sessions = await service.getActiveSessions('user-1', 'current-jti');

         expect(sessions).toHaveLength(2);
         expect(sessions[0].id).toBe('session-1');
         expect(sessions[0].isCurrent).toBe(true);
         expect(sessions[1].id).toBe('session-2');
         expect(sessions[1].isCurrent).toBe(false);
      });
   });

   describe('revokeSession', () => {
      it('should revoke a session successfully if found and owned by user', async () => {
         mockFindById.mockResolvedValue({
            id: 'session-1',
            accountId: 'user-1',
            refreshTokenJti: 'jti-1',
            isRevoked: false,
         });

         await service.revokeSession('user-1', 'session-1');

         expect(mockRevokeSession).toHaveBeenCalledWith('session-1', 'user-1');
         expect(mockRedisService.del).toHaveBeenCalledWith(`${REDIS_KEY_PREFIX.REFRESH_TOKEN}user-1:jti-1`);
      });

      it('should throw NotFoundException if session does not exist or owned by another user', async () => {
         mockFindById.mockResolvedValue(null);

         await expect(service.revokeSession('user-1', 'non-existent')).rejects.toThrow(NotFoundException);
      });
   });

   describe('revokeOtherSessions', () => {
      it('should revoke all other active sessions for user', async () => {
         mockRevokeOtherSessions.mockResolvedValue(['jti-other-1', 'jti-other-2']);

         const result = await service.revokeOtherSessions('user-1', 'current-jti');

         expect(result.revokedCount).toBe(2);
         expect(mockRedisService.del).toHaveBeenCalledWith(`${REDIS_KEY_PREFIX.REFRESH_TOKEN}user-1:jti-other-1`);
         expect(mockRedisService.del).toHaveBeenCalledWith(`${REDIS_KEY_PREFIX.REFRESH_TOKEN}user-1:jti-other-2`);
      });
   });

   describe('validateAccessToken', () => {
      it('should validate a valid access token successfully', async () => {
         const token = JwtUtil.sign(
            { sub: 'user-1', email: 'user@example.com', tokenType: JWT_TOKEN_TYPE.ACCESS, jti: 'jti-123' },
            mockConfigService.jwtPrivateKey,
            900,
         );

         const payload = await service.validateAccessToken(token);
         expect(payload.sub).toBe('user-1');
         expect(payload.tokenType).toBe(JWT_TOKEN_TYPE.ACCESS);
      });

      it('should throw UnauthorizedException if access token JTI is in Redis blacklist', async () => {
         const token = JwtUtil.sign(
            { sub: 'user-1', email: 'user@example.com', tokenType: JWT_TOKEN_TYPE.ACCESS, jti: 'revoked-jti' },
            mockConfigService.jwtPrivateKey,
            900,
         );
         mockRedisService.get.mockImplementation((key: string) => {
            if (key === `${REDIS_KEY_PREFIX.REVOKED_TOKEN}revoked-jti`) return Promise.resolve('revoked');
            return Promise.resolve(null);
         });

         await expect(service.validateAccessToken(token)).rejects.toThrow(UnauthorizedException);
         try {
            await service.validateAccessToken(token);
         } catch (err) {
            expect((err as UnauthorizedException).errorCode).toBe(AUTH_ERROR_CODES.TOKEN_REVOKED);
         }
      });
   });

   describe('validateRefreshToken', () => {
      it('should validate active refresh token in whitelist', async () => {
         const token = JwtUtil.sign(
            { sub: 'user-1', email: 'user@example.com', tokenType: JWT_TOKEN_TYPE.REFRESH, jti: 'jti-123' },
            mockConfigService.jwtPrivateKey,
            604800,
         );

         mockRedisService.get.mockResolvedValue(null);
         mockRedisService.getJson.mockResolvedValue({ userId: 'user-1', jti: 'jti-123' });

         const payload = await service.validateRefreshToken(token);
         expect(payload.sub).toBe('user-1');
         expect(payload.jti).toBe('jti-123');
      });
   });

   describe('revokeAllAccountTokens and logoutAll', () => {
      it('should revoke all tokens and all DB sessions', async () => {
         mockRedisService.smembers.mockResolvedValue(['jti-1', 'jti-2']);

         await service.revokeAllAccountTokens('user-1');

         expect(mockRedisService.del).toHaveBeenCalledWith(`${REDIS_KEY_PREFIX.ACCOUNT_SESSIONS}user-1`);
         expect(mockRevokeAllSessions).toHaveBeenCalledWith('user-1');
      });
   });
});
