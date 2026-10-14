import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RedisService, SERVICES, UnauthorizedException } from '@common';
import { AUTH_ERROR_CODES } from '@contracts/auth';
import { AUTH_METRICS_OTP_OPERATIONS, AUTH_METRICS_OTP_TYPES, AUTH_METRICS_STATUS } from '@auth/constants';
import { PasswordManagementService } from './password-management.service';
import { ACCOUNT_REPOSITORY } from '@auth/repositories';
import { AuthConfigService } from '@auth/config';
import {
   AUTH_METRICS_SERVICE,
   AUTH_RATE_LIMITER,
   AuditLogService,
   PASSWORD_HASHER,
   TOKEN_LIFECYCLE_SERVICE,
} from '@auth/services/infrastructure';

describe('PasswordManagementService', () => {
   let service: PasswordManagementService;

   const mockAccountRepository = {
      findById: jest.fn(),
      update: jest.fn(),
   };

   const mockPasswordHasher = {
      hash: jest.fn().mockResolvedValue('$argon2id$mock-new-hash'),
      verify: jest.fn().mockResolvedValue(true),
   };

   const mockTokenLifecycleService = {
      logoutAll: jest.fn(),
   };

   const mockRedisService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      ttl: jest.fn().mockResolvedValue(-2),
      setJson: jest.fn().mockResolvedValue(undefined),
      getJson: jest.fn(),
      incr: jest.fn().mockResolvedValue(1),
      expire: jest.fn(),
   };

   const mockAuditLogService = {
      record: jest.fn().mockResolvedValue(undefined),
   };

   const mockNotificationClient = {
      emit: jest.fn(),
   };

   const mockRateLimiter = {
      checkChangePassword: jest.fn().mockResolvedValue(undefined),
      checkVerifyChangePasswordOtp: jest.fn().mockResolvedValue(undefined),
      checkOrThrow: jest.fn().mockResolvedValue(undefined),
      checkRateLimit: jest.fn(),
      reset: jest.fn(),
   };

   const mockConfig = {
      argon2Secret: 'test-secret',
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
            PasswordManagementService,
            {
               provide: ACCOUNT_REPOSITORY,
               useValue: mockAccountRepository,
            },
            {
               provide: TOKEN_LIFECYCLE_SERVICE,
               useValue: mockTokenLifecycleService,
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
               provide: SERVICES.NOTIFICATION_SERVICE,
               useValue: mockNotificationClient,
            },
            {
               provide: AuthConfigService,
               useValue: mockConfig,
            },
            {
               provide: EventEmitter2,
               useValue: { emit: jest.fn() },
            },
            {
               provide: AUTH_METRICS_SERVICE,
               useValue: mockMetricsService,
            },
         ],
      }).compile();

      service = module.get<PasswordManagementService>(PasswordManagementService);
   });

   it('should be defined', () => {
      expect(service).toBeDefined();
   });

   it('should verify OTP and call tokenLifecycleService.logoutAll when logoutAll is requested', async () => {
      mockAccountRepository.findById.mockResolvedValue({
         id: 'acc1',
         email: 'test@example.com',
         passwordHash: 'old-hash',
      });
      mockRedisService.getJson.mockResolvedValue({
         otp: '123456',
         newPasswordHash: 'new-hash',
         logoutAll: true,
      });

      const result = await service.verifyChangePasswordOtp('acc1', { otp: '123456' });

      expect(result.success).toBe(true);
      expect(mockTokenLifecycleService.logoutAll).toHaveBeenCalledWith('acc1');
      expect(mockAccountRepository.update).toHaveBeenCalledWith('acc1', { passwordHash: 'new-hash' });
   });

   it('should rollback and restore old password hash if token revocation (logoutAll) fails', async () => {
      mockAccountRepository.findById.mockResolvedValue({
         id: 'acc1',
         email: 'test@example.com',
         passwordHash: 'old-hash',
      });
      mockRedisService.getJson.mockResolvedValue({
         otp: '123456',
         newPasswordHash: 'new-hash',
         logoutAll: true,
      });
      mockTokenLifecycleService.logoutAll.mockRejectedValue(new Error('Token revocation failure'));

      await expect(service.verifyChangePasswordOtp('acc1', { otp: '123456' })).rejects.toThrow(
         'Token revocation failure',
      );

      // Password was updated to new-hash, then compensated back to old-hash
      expect(mockAccountRepository.update).toHaveBeenNthCalledWith(1, 'acc1', { passwordHash: 'new-hash' });
      expect(mockAccountRepository.update).toHaveBeenNthCalledWith(2, 'acc1', { passwordHash: 'old-hash' });
   });

   it('should succeed even if audit log fails (non-blocking fire-and-forget)', async () => {
      mockAccountRepository.findById.mockResolvedValue({
         id: 'acc1',
         email: 'test@example.com',
         passwordHash: 'old-hash',
      });
      mockRedisService.getJson.mockResolvedValue({
         otp: '123456',
         newPasswordHash: 'new-hash',
         logoutAll: false,
      });
      mockAuditLogService.record.mockRejectedValue(new Error('Audit log write error'));

      const result = await service.verifyChangePasswordOtp('acc1', { otp: '123456' });

      expect(result.success).toBe(true);
      expect(mockAccountRepository.update).toHaveBeenCalledWith('acc1', { passwordHash: 'new-hash' });
   });

   describe('changePassword', () => {
      beforeEach(() => {
         mockPasswordHasher.verify.mockResolvedValue(true);
         mockPasswordHasher.hash.mockResolvedValue('$argon2id$mock-new-hash');
         mockRedisService.get.mockResolvedValue(null);
         mockAuditLogService.record.mockResolvedValue(undefined);
      });

      it('should throw UnauthorizedException if account not found', async () => {
         mockAccountRepository.findById.mockResolvedValue(null);

         await expect(
            service.changePassword('non-existent', {
               currentPassword: 'CurrentPassword123!',
               newPassword: 'NewPassword123!',
               confirmPassword: 'NewPassword123!',
            }),
         ).rejects.toThrow(UnauthorizedException);
      });

      it('should throw BadRequestException if currentPassword is invalid', async () => {
         mockAccountRepository.findById.mockResolvedValue({
            id: 'acc1',
            email: 'test@example.com',
            passwordHash: 'old-hash',
         });
         mockPasswordHasher.verify.mockResolvedValue(false);

         await expect(
            service.changePassword('acc1', {
               currentPassword: 'WrongPassword123!',
               newPassword: 'NewPassword123!',
               confirmPassword: 'NewPassword123!',
            }),
         ).rejects.toThrow(AUTH_ERROR_CODES.INVALID_OLD_PASSWORD);
      });

      it('should throw BadRequestException if newPassword is identical to currentPassword', async () => {
         mockAccountRepository.findById.mockResolvedValue({
            id: 'acc1',
            email: 'test@example.com',
            passwordHash: 'old-hash',
         });

         await expect(
            service.changePassword('acc1', {
               currentPassword: 'SamePassword123!',
               newPassword: 'SamePassword123!',
               confirmPassword: 'SamePassword123!',
            }),
         ).rejects.toThrow(AUTH_ERROR_CODES.PASSWORD_UNCHANGED);
      });

      it('should throw BadRequestException if newPassword fails domain strength rules', async () => {
         mockAccountRepository.findById.mockResolvedValue({
            id: 'acc1',
            email: 'test@example.com',
            passwordHash: 'old-hash',
         });

         await expect(
            service.changePassword('acc1', {
               currentPassword: 'CurrentPassword123!',
               newPassword: 'weak',
               confirmPassword: 'weak',
            }),
         ).rejects.toThrow(AUTH_ERROR_CODES.WEAK_PASSWORD);
      });

      it('should throw BadRequestException if OTP cooldown is active', async () => {
         mockAccountRepository.findById.mockResolvedValue({
            id: 'acc1',
            email: 'test@example.com',
            passwordHash: 'old-hash',
         });
         mockRedisService.get.mockResolvedValue('1');
         mockRedisService.ttl.mockResolvedValue(45);

         await expect(
            service.changePassword('acc1', {
               currentPassword: 'CurrentPassword123!',
               newPassword: 'NewPassword123!',
               confirmPassword: 'NewPassword123!',
            }),
         ).rejects.toThrow(AUTH_ERROR_CODES.OTP_COOLDOWN_ACTIVE);
      });

      it('should successfully initiate change password OTP with valid strong password', async () => {
         mockAccountRepository.findById.mockResolvedValue({
            id: 'acc1',
            email: 'test@example.com',
            passwordHash: 'old-hash',
         });

         const result = await service.changePassword('acc1', {
            currentPassword: 'CurrentPassword123!',
            newPassword: 'NewPassword123!',
            confirmPassword: 'NewPassword123!',
            logoutAll: true,
         });

         expect(result.success).toBe(true);
         expect(mockRedisService.setJson).toHaveBeenCalled();
         expect(mockNotificationClient.emit).toHaveBeenCalled();
         expect(mockAuditLogService.record).toHaveBeenCalled();
         expect(mockMetricsService.observePasswordHash).toHaveBeenCalled();
         expect(mockMetricsService.observeOtpOperation).toHaveBeenCalledWith(
            AUTH_METRICS_OTP_OPERATIONS.SEND,
            expect.any(Number),
         );
         expect(mockMetricsService.recordOtpOperation).toHaveBeenCalledWith(
            AUTH_METRICS_OTP_OPERATIONS.SEND,
            AUTH_METRICS_OTP_TYPES.PASSWORD_CHANGE,
            AUTH_METRICS_STATUS.SUCCESS,
         );
      });
   });

   describe('metrics on verifyChangePasswordOtp', () => {
      it('should record success metrics when OTP is verified', async () => {
         mockAccountRepository.findById.mockResolvedValue({
            id: 'acc1',
            email: 'test@example.com',
            passwordHash: 'old-hash',
         });
         mockRedisService.getJson.mockResolvedValue({
            otp: '123456',
            newPasswordHash: 'new-hash',
            logoutAll: false,
         });

         const result = await service.verifyChangePasswordOtp('acc1', { otp: '123456' });
         expect(result.success).toBe(true);
         expect(mockMetricsService.observeOtpOperation).toHaveBeenCalledWith(
            AUTH_METRICS_OTP_OPERATIONS.VERIFY,
            expect.any(Number),
         );
         expect(mockMetricsService.recordOtpOperation).toHaveBeenCalledWith(
            AUTH_METRICS_OTP_OPERATIONS.VERIFY,
            AUTH_METRICS_OTP_TYPES.PASSWORD_CHANGE,
            AUTH_METRICS_STATUS.SUCCESS,
         );
      });

      it('should record failure metrics when OTP is invalid', async () => {
         mockAccountRepository.findById.mockResolvedValue({
            id: 'acc1',
            email: 'test@example.com',
            passwordHash: 'old-hash',
         });
         mockRedisService.getJson.mockResolvedValue({
            otp: '123456',
            newPasswordHash: 'new-hash',
            logoutAll: false,
         });

         await expect(service.verifyChangePasswordOtp('acc1', { otp: 'wrong-otp' })).rejects.toThrow();
         expect(mockMetricsService.recordOtpOperation).toHaveBeenCalledWith(
            AUTH_METRICS_OTP_OPERATIONS.VERIFY,
            AUTH_METRICS_OTP_TYPES.PASSWORD_CHANGE,
            AUTH_METRICS_STATUS.FAILURE,
         );
      });
   });
});
