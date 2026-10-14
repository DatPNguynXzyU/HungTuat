import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RbacCacheService, RedisService } from '@common';
import { AUTH_METRICS_REASONS, AUTH_METRICS_STATUS } from '@auth/constants';
import { AuthCoreService } from '@auth/services/domain/auth-core.service';
import { ACCOUNT_REPOSITORY, RBAC_REPOSITORY } from '@auth/repositories';
import { AuthConfigService } from '@auth/config';
import {
   AUTH_METRICS_SERVICE,
   AUTH_RATE_LIMITER,
   AuditLogService,
   JWT_SERVICE,
   PASSWORD_HASHER,
   TOKEN_LIFECYCLE_SERVICE,
} from '@auth/services/infrastructure';

describe('AuthCoreService', () => {
   let service: AuthCoreService;

   const mockAccountRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findEmailById: jest.fn(),
      update: jest.fn(),
   };

   const mockRbacRepository = {
      findRoleByCode: jest.fn(),
   };

   const mockPasswordHasher = {
      hash: jest.fn(),
      verify: jest.fn().mockResolvedValue(true),
   };

   const mockTokenLifecycleService = {
      generateTokenPair: jest.fn(),
      rotateTokenPair: jest.fn(),
      validateAccessToken: jest.fn(),
      validateRefreshToken: jest.fn(),
      revokeToken: jest.fn(),
      revokeAllAccountTokens: jest.fn(),
      logoutAll: jest.fn(),
   };

   const mockJwtService = {
      getJwks: jest.fn().mockReturnValue({ keys: [] }),
   };

   const mockRedisService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      ttl: jest.fn().mockResolvedValue(-2),
      incr: jest.fn().mockResolvedValue(1),
      expire: jest.fn(),
   };

   const mockAuditLogService = {
      record: jest.fn().mockResolvedValue(undefined),
   };

   const mockRateLimiter = {
      checkLogin: jest.fn().mockResolvedValue(undefined),
      checkRefreshToken: jest.fn().mockResolvedValue(undefined),
      checkOrThrow: jest.fn().mockResolvedValue(undefined),
      checkRateLimit: jest.fn(),
      reset: jest.fn(),
   };

   const mockConfig = {
      argon2Secret: 'test-secret',
   };

   const mockEventEmitter = {
      emit: jest.fn(),
   };

   const mockMetricsService = {
      recordLoginAttempt: jest.fn(),
      recordRegistrationAttempt: jest.fn(),
      recordTokenOperation: jest.fn(),
      recordOtpOperation: jest.fn(),
      recordSessionOperation: jest.fn(),
      setActiveSessions: jest.fn(),
      setLockedAccounts: jest.fn(),
      setOutboxPending: jest.fn(),
      observeTokenGeneration: jest.fn(),
      observeLoginDuration: jest.fn(),
      observePasswordHash: jest.fn(),
      observeOtpOperation: jest.fn(),
      startTimer: jest.fn().mockReturnValue(100),
      calculateDuration: jest.fn().mockReturnValue(0.05),
      getMetrics: jest.fn(),
      reset: jest.fn(),
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            AuthCoreService,
            {
               provide: RbacCacheService,
               useValue: { getRole: jest.fn().mockResolvedValue({ id: 'r1', permissions: [] }), setRole: jest.fn() },
            },
            {
               provide: ACCOUNT_REPOSITORY,
               useValue: mockAccountRepository,
            },
            {
               provide: RBAC_REPOSITORY,
               useValue: mockRbacRepository,
            },
            {
               provide: TOKEN_LIFECYCLE_SERVICE,
               useValue: mockTokenLifecycleService,
            },
            {
               provide: JWT_SERVICE,
               useValue: mockJwtService,
            },
            {
               provide: PASSWORD_HASHER,
               useValue: mockPasswordHasher,
            },
            {
               provide: AUTH_RATE_LIMITER,
               useValue: mockRateLimiter,
            },
            {
               provide: RedisService,
               useValue: mockRedisService,
            },
            {
               provide: AuditLogService,
               useValue: mockAuditLogService,
            },
            {
               provide: AuthConfigService,
               useValue: mockConfig,
            },
            {
               provide: EventEmitter2,
               useValue: mockEventEmitter,
            },
            {
               provide: AUTH_METRICS_SERVICE,
               useValue: mockMetricsService,
            },
         ],
      }).compile();

      service = module.get<AuthCoreService>(AuthCoreService);
   });

   it('should be defined', () => {
      expect(service).toBeDefined();
   });

   it('should return JWKS from jwtService', () => {
      const jwks = service.getJwks();
      expect(jwks).toEqual({ keys: [] });
      expect(mockJwtService.getJwks).toHaveBeenCalledTimes(1);
   });

   it('should logout all', async () => {
      await service.logoutAll('acc1');
      expect(mockTokenLifecycleService.logoutAll).toHaveBeenCalledWith('acc1');
      expect(mockAuditLogService.record).toHaveBeenCalled();
   });

   describe('login with LoginSaga', () => {
      const mockAccount = {
         id: 'user-id-1',
         email: 'test@example.com',
         passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$dummyhash',
         roles: ['USER'],
         status: 'ACTIVE',
         isEmailVerified: true,
         lastLoginAt: '2026-10-12T00:00:00.000Z',
         createdAt: '2026-10-10T00:00:00.000Z',
         updatedAt: '2026-10-12T00:00:00.000Z',
      };

      beforeEach(() => {
         mockPasswordHasher.verify.mockResolvedValue(true);
         mockAccountRepository.findByEmail.mockResolvedValue(mockAccount);
         mockTokenLifecycleService.generateTokenPair.mockResolvedValue({
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
         });
         mockAccountRepository.update.mockResolvedValue(mockAccount);
      });

      it('should successfully login, generate tokens first, update db, clear redis, and record audit log', async () => {
         const result = await service.login({ email: 'test@example.com', password: 'password123' });

         expect(result.user.id).toBe('user-id-1');
         expect(result.accessToken).toBe('mock-access-token');
         expect(result.refreshToken).toBe('mock-refresh-token');

         // Token pair generated first
         expect(mockTokenLifecycleService.generateTokenPair).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'user-id-1', email: 'test@example.com' }),
            undefined,
         );
         // Database updated with new lastLoginAt
         expect(mockAccountRepository.update).toHaveBeenCalledWith(
            'user-id-1',
            expect.objectContaining({ lastLoginAt: expect.any(String) as unknown }) as unknown,
         );
         // Redis attempt keys cleared
         expect(mockRedisService.del).toHaveBeenCalled();
         // Audit log recorded
         expect(mockAuditLogService.record).toHaveBeenCalled();
      });

      it('should rollback and revoke tokens if database update fails', async () => {
         mockAccountRepository.update.mockRejectedValue(new Error('Database write failure'));

         await expect(service.login({ email: 'test@example.com', password: 'password123' })).rejects.toThrow(
            'Database write failure',
         );

         expect(mockTokenLifecycleService.revokeAllAccountTokens).toHaveBeenCalledWith('user-id-1');
      });

      it('should succeed even if audit log fails (non-blocking fire-and-forget)', async () => {
         mockAuditLogService.record.mockRejectedValueOnce(new Error('Audit log DB failure'));

         const result = await service.login({ email: 'test@example.com', password: 'password123' });

         expect(result.user.id).toBe('user-id-1');
         expect(result.accessToken).toBe('mock-access-token');
      });

      it('should call rateLimiter.checkLogin on login and throw if rate limited', async () => {
         mockRateLimiter.checkLogin.mockRejectedValueOnce(new Error('Rate limit exceeded'));

         await expect(service.login({ email: 'test@example.com', password: 'password123' })).rejects.toThrow(
            'Rate limit exceeded',
         );
         expect(mockRateLimiter.checkLogin).toHaveBeenCalledWith('test@example.com', 'unknown');
      });

      it('should record login metrics on success and failure', async () => {
         const result = await service.login({ email: 'test@example.com', password: 'password123' });
         expect(result.accessToken).toBe('mock-access-token');
         expect(mockMetricsService.recordLoginAttempt).toHaveBeenCalledWith(AUTH_METRICS_STATUS.SUCCESS);
         expect(mockMetricsService.observeLoginDuration).toHaveBeenCalledWith(expect.any(Number));

         mockAccountRepository.findByEmail.mockResolvedValueOnce(null);
         await expect(service.login({ email: 'unknown@example.com', password: 'password123' })).rejects.toThrow();
         expect(mockMetricsService.recordLoginAttempt).toHaveBeenCalledWith(
            AUTH_METRICS_STATUS.FAILURE,
            AUTH_METRICS_REASONS.INVALID_CREDENTIALS,
         );
      });
   });

   describe('refreshToken rate limiting', () => {
      it('should check rate limit on refresh token before proceeding', async () => {
         mockTokenLifecycleService.validateRefreshToken.mockResolvedValue({ sub: 'acc-123' });
         mockAccountRepository.findById.mockResolvedValue({
            id: 'acc-123',
            email: 'test@example.com',
            status: 'ACTIVE',
         });
         mockTokenLifecycleService.rotateTokenPair.mockResolvedValue({
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
         });

         await service.refreshToken('valid-token');
         expect(mockRateLimiter.checkRefreshToken).toHaveBeenCalledWith('acc-123');
      });
   });
});
