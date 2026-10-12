import { Test, TestingModule } from '@nestjs/testing';
import { SessionManagementService } from './session-management.service';
import { AuditLogService, TOKEN_SERVICE } from '@auth/services/infrastructure';

describe('SessionManagementService', () => {
   let service: SessionManagementService;

   const mockTokenService = {
      getActiveSessions: jest.fn().mockResolvedValue([]),
      revokeSession: jest.fn().mockResolvedValue(undefined),
      revokeOtherSessions: jest.fn().mockResolvedValue({ revokedCount: 2 }),
      logoutAll: jest.fn().mockResolvedValue(undefined),
   };

   const mockAuditLogService = {
      record: jest.fn().mockResolvedValue(undefined),
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            SessionManagementService,
            {
               provide: TOKEN_SERVICE,
               useValue: mockTokenService,
            },
            {
               provide: AuditLogService,
               useValue: mockAuditLogService,
            },
         ],
      }).compile();

      service = module.get<SessionManagementService>(SessionManagementService);
   });

   it('should be defined', () => {
      expect(service).toBeDefined();
   });

   it('should get active sessions', async () => {
      const result = await service.getSessions('acc1', 'jti1');
      expect(result).toEqual([]);
      expect(mockTokenService.getActiveSessions).toHaveBeenCalledWith('acc1', 'jti1');
   });

   it('should revoke a session', async () => {
      await service.revokeSession('acc1', 'sess1');
      expect(mockTokenService.revokeSession).toHaveBeenCalledWith('acc1', 'sess1');
      expect(mockAuditLogService.record).toHaveBeenCalled();
   });

   it('should revoke other sessions', async () => {
      const result = await service.revokeOtherSessions('acc1', 'jti1');
      expect(result.revokedCount).toBe(2);
      expect(mockTokenService.revokeOtherSessions).toHaveBeenCalledWith('acc1', 'jti1');
   });
});
