import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { DEFAULT_ROLES } from '@common';
import { AUTH_V1_GRPC_CLIENT, AUTH_V1_GRPC_SERVICE_NAME } from '@contracts/auth';
import { AuditLogsService } from '@/modules/audit-logs/audit-logs.service';
import type { JwtPayload } from '@common';

describe('AuditLogsService', () => {
   let service: AuditLogsService;
   const mockAuthGrpcService = {
      getAuditLogs: jest.fn(),
      getAuditLogById: jest.fn(),
   };
   const mockAuthGrpcClient = {
      getService: jest.fn().mockReturnValue(mockAuthGrpcService),
   };

   const mockUser: JwtPayload = {
      sub: 'user-admin-1',
      email: 'admin@example.com',
      roles: [DEFAULT_ROLES.ADMIN],
      jti: 'session-123',
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            AuditLogsService,
            {
               provide: AUTH_V1_GRPC_CLIENT,
               useValue: mockAuthGrpcClient,
            },
         ],
      }).compile();

      service = module.get<AuditLogsService>(AuditLogsService);
      service.onModuleInit();
   });

   it('should be defined', () => {
      expect(service).toBeDefined();
      expect(mockAuthGrpcClient.getService).toHaveBeenCalledWith(AUTH_V1_GRPC_SERVICE_NAME);
   });

   it('should call authGrpcService to get audit logs with user context', async () => {
      const mockResult = {
         items: [
            {
               auditLogId: 'audit-1',
               userId: 'user-admin-1',
               action: 'AUTH.LOGIN_SUCCESS',
               status: 'SUCCESS',
               createdAt: '2026-10-22T00:00:00.000Z',
            },
         ],
         total: 1,
         page: 1,
         limit: 10,
         totalPages: 1,
      };
      mockAuthGrpcService.getAuditLogs.mockReturnValue(of(mockResult));

      const result = await service.getAuditLogs({ page: 1, limit: 10 }, mockUser);
      expect(mockAuthGrpcService.getAuditLogs).toHaveBeenCalled();
      expect(result.data[0].auditLogId).toBe('audit-1');
      expect(result.total).toBe(1);
   });

   it('should call authGrpcService to get audit log by ID with user context', async () => {
      const mockLog = {
         auditLog: {
            auditLogId: 'audit-1',
            userId: 'user-admin-1',
            action: 'AUTH.LOGIN_SUCCESS',
            status: 'SUCCESS',
            createdAt: '2026-10-22T00:00:00.000Z',
         },
      };
      mockAuthGrpcService.getAuditLogById.mockReturnValue(of(mockLog));

      const result = await service.getAuditLogById('audit-1', mockUser);
      expect(mockAuthGrpcService.getAuditLogById).toHaveBeenCalled();
      expect(result?.auditLogId).toBe('audit-1');
   });

   it('should return null when audit log is not found', async () => {
      mockAuthGrpcService.getAuditLogById.mockReturnValue(of({ auditLog: undefined }));

      const result = await service.getAuditLogById('non-existent', mockUser);
      expect(result).toBeNull();
   });
});
