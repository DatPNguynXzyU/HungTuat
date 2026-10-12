import { Test, TestingModule } from '@nestjs/testing';
import { RbacCacheService, RedisService } from '@common';
import { AuthCoreService } from './auth-core.service';
import { AUTH_REPOSITORY } from '@auth/repositories';
import { AuthConfigService } from '@auth/config';
import { AuditLogService, TOKEN_SERVICE } from '@auth/services/infrastructure';

describe('AuthCoreService', () => {
   let service: AuthCoreService;

   const mockAuthRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findEmailById: jest.fn(),
      findRoleByCode: jest.fn(),
      updateAccount: jest.fn(),
   };

   const mockTokenService = {
      generateTokenPair: jest.fn(),
      rotateTokenPair: jest.fn(),
      validateAccessToken: jest.fn(),
      validateRefreshToken: jest.fn(),
      revokeToken: jest.fn(),
      revokeAllAccountTokens: jest.fn(),
      logoutAll: jest.fn(),
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

   const mockConfig = {
      argon2Secret: 'test-secret',
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
               provide: AuthConfigService,
               useValue: mockConfig,
            },
         ],
      }).compile();

      service = module.get<AuthCoreService>(AuthCoreService);
   });

   it('should be defined', () => {
      expect(service).toBeDefined();
   });

   it('should logout all', async () => {
      await service.logoutAll('acc1');
      expect(mockTokenService.logoutAll).toHaveBeenCalledWith('acc1');
      expect(mockAuditLogService.record).toHaveBeenCalled();
   });
});
