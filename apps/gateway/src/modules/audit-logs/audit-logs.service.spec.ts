import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { AUTH_PATTERNS, SERVICES } from '@common';
import { AuditLogsService } from '@/modules/audit-logs/audit-logs.service';

describe('AuditLogsService', () => {
   let service: AuditLogsService;
   const mockAuthClient = {
      send: jest.fn(),
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            AuditLogsService,
            {
               provide: SERVICES.AUTH_SERVICE,
               useValue: mockAuthClient,
            },
         ],
      }).compile();

      service = module.get<AuditLogsService>(AuditLogsService);
   });

   it('should be defined', () => {
      expect(service).toBeDefined();
   });

   it('should call authClient to get audit logs', async () => {
      const mockResult = {
         data: [{ id: 'audit-1', action: 'AUTH.LOGIN_SUCCESS' }],
         total: 1,
         page: 1,
         limit: 10,
         totalPages: 1,
      };
      mockAuthClient.send.mockReturnValue(of(mockResult));

      const result = await service.getAuditLogs({ page: 1, limit: 10 });
      expect(mockAuthClient.send).toHaveBeenCalledWith({ cmd: AUTH_PATTERNS.GET_AUDIT_LOGS }, { page: 1, limit: 10 });
      expect(result).toEqual(mockResult);
   });

   it('should call authClient to get audit log by ID', async () => {
      const mockLog = { id: 'audit-1', action: 'AUTH.LOGIN_SUCCESS' };
      mockAuthClient.send.mockReturnValue(of(mockLog));

      const result = await service.getAuditLogById('audit-1');
      expect(mockAuthClient.send).toHaveBeenCalledWith({ cmd: AUTH_PATTERNS.GET_AUDIT_LOG_BY_ID }, { id: 'audit-1' });
      expect(result).toEqual(mockLog);
   });
});
