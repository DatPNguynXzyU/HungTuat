import { Test, TestingModule } from '@nestjs/testing';
import { AuditStatus } from '@prisma/client';
import { AUDIT_LOG_REPOSITORY } from '@auth/repositories/audit-log.repository.interface';
import { AuditLogService } from '@auth/services/audit-log.service';

describe('AuditLogService', () => {
   let service: AuditLogService;

   const sampleAuditLog = {
      id: 'audit-id-1',
      userId: 'user-id-1',
      actorEmail: 'test@example.com',
      action: 'AUTH.LOGIN_SUCCESS',
      status: AuditStatus.SUCCESS,
      ipAddress: '127.0.0.1',
      createdAt: '2026-09-28T00:00:00.000Z',
   };

   const mockAuditLogRepository = {
      createAuditLog: jest.fn(),
      findAuditLogs: jest.fn(),
      findById: jest.fn(),
      findUserAuditLogs: jest.fn(),
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            AuditLogService,
            {
               provide: AUDIT_LOG_REPOSITORY,
               useValue: mockAuditLogRepository,
            },
         ],
      }).compile();

      service = module.get<AuditLogService>(AuditLogService);
   });

   it('should record audit log successfully', async () => {
      mockAuditLogRepository.createAuditLog.mockResolvedValue(sampleAuditLog);

      const result = await service.record({
         userId: 'user-id-1',
         action: 'AUTH.LOGIN_SUCCESS',
      });

      expect(result).toEqual(sampleAuditLog);
      expect(mockAuditLogRepository.createAuditLog).toHaveBeenCalled();
   });

   it('should handle repository error gracefully when recording', async () => {
      mockAuditLogRepository.createAuditLog.mockRejectedValue(new Error('Database unavailable'));

      const result = await service.record({
         userId: 'user-id-1',
         action: 'AUTH.LOGIN_SUCCESS',
      });

      expect(result).toBeNull();
   });

   it('should get audit logs list', async () => {
      const mockResult = {
         data: [sampleAuditLog],
         total: 1,
         page: 1,
         limit: 10,
         totalPages: 1,
      };
      mockAuditLogRepository.findAuditLogs.mockResolvedValue(mockResult);

      const result = await service.getAuditLogs({ page: 1, limit: 10 });
      expect(result).toEqual(mockResult);
   });

   it('should get audit log by id', async () => {
      mockAuditLogRepository.findById.mockResolvedValue(sampleAuditLog);

      const result = await service.getAuditLogById('audit-id-1');
      expect(result).toEqual(sampleAuditLog);
   });

   it('should get user audit logs', async () => {
      const mockResult = {
         data: [sampleAuditLog],
         total: 1,
         page: 1,
         limit: 10,
         totalPages: 1,
      };
      mockAuditLogRepository.findUserAuditLogs.mockResolvedValue(mockResult);

      const result = await service.getUserAuditLogs('user-id-1', 1, 10);
      expect(result).toEqual(mockResult);
   });
});
