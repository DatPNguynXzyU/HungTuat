import { Test, TestingModule } from '@nestjs/testing';
import { RedisService, SERVICES } from '@common';
import { PasswordManagementService } from './password-management.service';
import { AUTH_REPOSITORY } from '@auth/repositories';
import { AuthConfigService } from '@auth/config';
import { AuditLogService, TOKEN_SERVICE } from '@auth/services/infrastructure';

describe('PasswordManagementService', () => {
   let service: PasswordManagementService;

   const mockAuthRepository = {
      findById: jest.fn(),
      updateAccount: jest.fn(),
   };

   const mockTokenService = {
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

   const mockConfig = {
      argon2Secret: 'test-secret',
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            PasswordManagementService,
            {
               provide: AUTH_REPOSITORY,
               useValue: mockAuthRepository,
            },
            {
               provide: TOKEN_SERVICE,
               useValue: mockTokenService,
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

      service = module.get<PasswordManagementService>(PasswordManagementService);
   });

   it('should be defined', () => {
      expect(service).toBeDefined();
   });
});
