import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogsController } from '@/modules/audit-logs/audit-logs.controller';
import { AuditLogsService } from '@/modules/audit-logs/audit-logs.service';
import type { JwtPayload } from '@common';

describe('AuditLogsController', () => {
   let controller: AuditLogsController;
   const mockAuditLogsService = {
      getAuditLogs: jest.fn(),
      getAuditLogById: jest.fn(),
   };
   const mockUser: JwtPayload = {
      sub: 'user-admin-1',
      email: 'admin@example.com',
      roles: ['admin'],
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         controllers: [AuditLogsController],
         providers: [
            {
               provide: AuditLogsService,
               useValue: mockAuditLogsService,
            },
         ],
      }).compile();

      controller = module.get<AuditLogsController>(AuditLogsController);
   });

   it('should be defined', () => {
      expect(controller).toBeDefined();
   });

   it('should get audit logs list', async () => {
      const mockResult = {
         data: [{ id: 'audit-1', action: 'AUTH.LOGIN_SUCCESS' }],
         total: 1,
         page: 1,
         limit: 10,
         totalPages: 1,
      };
      mockAuditLogsService.getAuditLogs.mockResolvedValue(mockResult);

      const result = await controller.getAuditLogs({ page: 1, limit: 10 }, mockUser);
      expect(mockAuditLogsService.getAuditLogs).toHaveBeenCalledWith({ page: 1, limit: 10 }, mockUser);
      expect(result).toEqual(mockResult);
   });

   it('should get audit log by ID', async () => {
      const mockLog = { id: 'audit-1', action: 'AUTH.LOGIN_SUCCESS' };
      mockAuditLogsService.getAuditLogById.mockResolvedValue(mockLog);

      const result = await controller.getAuditLogById('audit-1', mockUser);
      expect(mockAuditLogsService.getAuditLogById).toHaveBeenCalledWith('audit-1', mockUser);
      expect(result).toEqual(mockLog);
   });
});
