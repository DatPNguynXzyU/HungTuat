import { Test, TestingModule } from '@nestjs/testing';
import { RedisService, UnauthorizedException } from '@common';
import {
   AUTH_ERROR_CODES,
   DEFAULT_DEV_RSA_PRIVATE_KEY,
   DEFAULT_DEV_RSA_PUBLIC_KEY,
   DEFAULT_JWT_KEY_ID,
   ITokenAccountPayload,
   JWT_TOKEN_TYPE,
} from '@contracts/auth';
import { AuthConfigService } from '@auth/config';
import { SESSION_REPOSITORY } from '@auth/repositories';
import { JWT_SERVICE } from './token.service.interface';
import { JwtService } from './jwt.service';
import { TokenLifecycleService } from './token-lifecycle.service';
import { AUTH_METRICS_SERVICE } from './auth-metrics.interface';
import {
   AUTH_METRICS_STATUS,
   AUTH_METRICS_TOKEN_OPERATIONS,
   AUTH_METRICS_TOKEN_TYPES,
   AuthRedisKeys,
   TOKEN_REVOCATION_VALUE,
} from '@auth/constants';

describe('TokenLifecycleService', () => {
   let service: TokenLifecycleService;
   let jwtService: JwtService;

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
   const mockFindByJti = jest.fn();
   const mockUpdateSession = jest.fn();
   const mockUpdateSessionByJti = jest.fn();
   const mockRevokeAllSessions = jest.fn();

   const mockConfigService = {
      jwtPrivateKey: DEFAULT_DEV_RSA_PRIVATE_KEY,
      jwtPublicKey: DEFAULT_DEV_RSA_PUBLIC_KEY,
      jwtKeyId: DEFAULT_JWT_KEY_ID,
      jwtAccessTokenExpiresIn: 900,
      jwtRefreshTokenExpiresIn: 604800,
   };

   const mockMetricsService = {
      startTimer: jest.fn().mockReturnValue(1000),
      calculateDuration: jest.fn().mockReturnValue(0.05),
      observeTokenGeneration: jest.fn(),
      recordTokenOperation: jest.fn(),
      recordLoginAttempt: jest.fn(),
      recordRegistrationAttempt: jest.fn(),
      recordOtpOperation: jest.fn(),
      recordSessionOperation: jest.fn(),
      setActiveSessions: jest.fn(),
      setLockedAccounts: jest.fn(),
      setOutboxPending: jest.fn(),
      observeLoginDuration: jest.fn(),
      observePasswordHash: jest.fn(),
      observeOtpOperation: jest.fn(),
      getMetrics: jest.fn().mockResolvedValue(''),
      reset: jest.fn(),
      contentType: 'text/plain',
   };

   beforeEach(async () => {
      jest.clearAllMocks();
      mockRedisService.smembers.mockResolvedValue([]);
      mockRedisService.get.mockResolvedValue(null);
      mockCreateSession.mockResolvedValue({ id: 'session-id-1' });
      mockRevokeAllSessions.mockResolvedValue([]);

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            JwtService,
            {
               provide: JWT_SERVICE,
               useExisting: JwtService,
            },
            TokenLifecycleService,
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
                  findByJti: mockFindByJti,
                  updateSession: mockUpdateSession,
                  updateSessionByJti: mockUpdateSessionByJti,
                  revokeAllSessions: mockRevokeAllSessions,
               },
            },
            {
               provide: AUTH_METRICS_SERVICE,
               useValue: mockMetricsService,
            },
         ],
      }).compile();

      service = module.get<TokenLifecycleService>(TokenLifecycleService);
      jwtService = module.get<JwtService>(JwtService);
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
            expect.stringContaining(AuthRedisKeys.refreshTokenPattern('user-id-1').replace('*', '')),
            expect.objectContaining({ accountId: 'user-id-1' }),
            mockConfigService.jwtRefreshTokenExpiresIn,
         );

         // Redis session set verification
         expect(mockRedisService.sadd).toHaveBeenCalledWith(
            AuthRedisKeys.sessions('user-id-1'),
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

   describe('validateAccessToken', () => {
      it('should validate a valid access token successfully', async () => {
         const token = jwtService.sign(
            { sub: 'user-1', email: 'user@example.com', tokenType: JWT_TOKEN_TYPE.ACCESS, jti: 'jti-123' },
            900,
         );

         const payload = await service.validateAccessToken(token);
         expect(payload.sub).toBe('user-1');
         expect(payload.tokenType).toBe(JWT_TOKEN_TYPE.ACCESS);
      });

      it('should throw UnauthorizedException if access token JTI is in Redis blacklist', async () => {
         const token = jwtService.sign(
            { sub: 'user-1', email: 'user@example.com', tokenType: JWT_TOKEN_TYPE.ACCESS, jti: 'revoked-jti' },
            900,
         );
         mockRedisService.get.mockImplementation((key: string) => {
            if (key === AuthRedisKeys.revokedToken('revoked-jti')) return Promise.resolve(TOKEN_REVOCATION_VALUE);
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
         const token = jwtService.sign(
            { sub: 'user-1', email: 'user@example.com', tokenType: JWT_TOKEN_TYPE.REFRESH, jti: 'jti-123' },
            604800,
         );

         mockRedisService.get.mockResolvedValue(null);
         mockRedisService.getJson.mockResolvedValue({ accountId: 'user-1', jti: 'jti-123' });

         const payload = await service.validateRefreshToken(token);
         expect(payload.sub).toBe('user-1');
         expect(payload.jti).toBe('jti-123');
      });
   });

   describe('revokeAllAccountTokens and logoutAll', () => {
      it('should revoke all tokens and all DB sessions', async () => {
         mockRedisService.smembers.mockResolvedValue(['jti-1', 'jti-2']);

         await service.revokeAllAccountTokens('user-1');

         expect(mockRedisService.del).toHaveBeenCalledWith(AuthRedisKeys.sessions('user-1'));
         expect(mockRevokeAllSessions).toHaveBeenCalledWith('user-1');
      });
   });

   describe('metrics integration', () => {
      it('should record metrics on generateTokenPair', async () => {
         const payload: ITokenAccountPayload = {
            id: 'user-1',
            email: 'user@example.com',
            roles: ['USER'],
         };
         await service.generateTokenPair(payload);
         expect(mockMetricsService.startTimer).toHaveBeenCalled();
         expect(mockMetricsService.observeTokenGeneration).toHaveBeenCalledWith(AUTH_METRICS_TOKEN_TYPES.ACCESS, 0.05);
         expect(mockMetricsService.recordTokenOperation).toHaveBeenCalledWith(
            AUTH_METRICS_TOKEN_OPERATIONS.GENERATE,
            AUTH_METRICS_STATUS.SUCCESS,
         );
      });

      it('should record metrics on rotateTokenPair', async () => {
         const payload: ITokenAccountPayload = {
            id: 'user-1',
            email: 'user@example.com',
            roles: ['USER'],
         };
         mockFindByJti.mockResolvedValue(null);
         await service.rotateTokenPair(payload, 'old-jti');
         expect(mockMetricsService.observeTokenGeneration).toHaveBeenCalledWith(AUTH_METRICS_TOKEN_TYPES.REFRESH, 0.05);
         expect(mockMetricsService.recordTokenOperation).toHaveBeenCalledWith(
            AUTH_METRICS_TOKEN_OPERATIONS.REFRESH,
            AUTH_METRICS_STATUS.SUCCESS,
         );
      });

      it('should record metrics on revokeToken', async () => {
         const token = jwtService.sign(
            { sub: 'user-1', email: 'user@example.com', tokenType: JWT_TOKEN_TYPE.ACCESS, jti: 'jti-123' },
            900,
         );
         await service.revokeToken(token);
         expect(mockMetricsService.recordTokenOperation).toHaveBeenCalledWith(
            AUTH_METRICS_TOKEN_OPERATIONS.REVOKE,
            AUTH_METRICS_STATUS.SUCCESS,
         );
      });
   });
});
