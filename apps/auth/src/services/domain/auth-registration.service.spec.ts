import { Test, TestingModule } from '@nestjs/testing';
import { RbacCacheService, RedisService, SERVICES } from '@common';
import { AuthRegistrationService } from './auth-registration.service';
import { AUTH_REPOSITORY } from '@auth/repositories';
import { AuthConfigService } from '@auth/config';
import { OutboxPublisherService } from '@auth/outbox';
import { AuditLogService, EmailBloomFilterService, TOKEN_SERVICE } from '@auth/services/infrastructure';

describe('AuthRegistrationService', () => {
   let service: AuthRegistrationService;

   const mockAuthRepository = {
      findByEmail: jest.fn(),
      findRoleByCode: jest.fn(),
      createAccount: jest.fn(),
   };

   const mockTokenService = {
      generateTokenPair: jest.fn(),
      generateVerificationToken: jest.fn(),
      consumeVerificationToken: jest.fn(),
   };

   const mockEmailBloomFilterService = {
      isEmailAvailable: jest.fn().mockResolvedValue(true),
      mightContain: jest.fn().mockResolvedValue(false),
      addEmail: jest.fn().mockResolvedValue(undefined),
   };

   const mockOutboxPublisherService = {
      triggerPublish: jest.fn(),
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

   const mockNotificationClient = {
      emit: jest.fn(),
   };

   const mockConfig = {
      argon2Secret: 'test-secret',
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            AuthRegistrationService,
            {
               provide: RbacCacheService,
               useValue: { getRole: jest.fn().mockResolvedValue({ id: 'r1', permissions: [] }), setRole: jest.fn() },
            },
            {
               provide: AUTH_REPOSITORY,
               useValue: mockAuthRepository,
            },
            {
               provide: TOKEN_SERVICE,
               useValue: mockTokenService,
            },
            {
               provide: EmailBloomFilterService,
               useValue: mockEmailBloomFilterService,
            },
            {
               provide: OutboxPublisherService,
               useValue: mockOutboxPublisherService,
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
         ],
      }).compile();

      service = module.get<AuthRegistrationService>(AuthRegistrationService);
   });

   it('should be defined', () => {
      expect(service).toBeDefined();
   });

   it('should check email availability', async () => {
      const result = await service.checkEmail('test@example.com');
      expect(result).toEqual({ available: true, email: 'test@example.com' });
   });

   it('should send register OTP', async () => {
      const result = await service.sendRegisterOtp({ email: 'test@example.com' });
      expect(result.success).toBe(true);
      expect(mockNotificationClient.emit).toHaveBeenCalled();
   });
});
