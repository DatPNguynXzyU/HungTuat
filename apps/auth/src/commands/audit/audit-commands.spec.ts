import {
   CreateAuditLogCommand,
   CreateAuditLogHandler,
   GetAccountAuditLogsCommand,
   GetAccountAuditLogsHandler,
   GetAuditLogByIdCommand,
   GetAuditLogByIdHandler,
   GetAuditLogsCommand,
   GetAuditLogsHandler,
} from '@auth/commands/audit';
import type { AuditLogService } from '@auth/services/infrastructure';
import { DEFAULT_ROLES } from '@common';

describe('Audit Command Handlers', () => {
   let auditLogService: jest.Mocked<Partial<AuditLogService>>;

   beforeEach(() => {
      auditLogService = {
         record: jest.fn().mockResolvedValue({ id: 'audit-1' }),
         getAuditLogs: jest.fn().mockResolvedValue({ data: [], total: 0 }),
         getAuditLogById: jest.fn().mockResolvedValue({ id: 'audit-1' }),
         getAccountAuditLogs: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      };
   });

   it('should execute CreateAuditLogCommand', async () => {
      const handler = new CreateAuditLogHandler(auditLogService as AuditLogService);
      const dto = { action: 'LOGIN_ATTEMPT', status: 'SUCCESS' as const };
      const result = await handler.execute(new CreateAuditLogCommand(dto));

      expect(auditLogService.record).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: 'audit-1' });
   });

   it('should execute GetAuditLogsCommand with admin role', async () => {
      const handler = new GetAuditLogsHandler(auditLogService as AuditLogService);
      const message = {
         user: {
            id: 'admin-1',
            userId: 'admin-1',
            email: 'admin@example.com',
            roles: [DEFAULT_ROLES.ADMIN],
            permissions: [],
         },
         data: { page: 1, limit: 10 },
      };
      const result = await handler.execute(new GetAuditLogsCommand(message));

      expect(auditLogService.getAuditLogs).toHaveBeenCalledWith(message.data);
      expect(result).toEqual({ data: [], total: 0 });
   });

   it('should reject GetAuditLogsCommand without admin role', async () => {
      const handler = new GetAuditLogsHandler(auditLogService as AuditLogService);
      const message = {
         user: {
            id: 'user-1',
            userId: 'user-1',
            email: 'user@example.com',
            roles: [DEFAULT_ROLES.USER],
            permissions: [],
         },
         data: { page: 1, limit: 10 },
      };

      await expect(handler.execute(new GetAuditLogsCommand(message))).rejects.toThrow();
   });

   it('should execute GetAuditLogByIdCommand with admin role', async () => {
      const handler = new GetAuditLogByIdHandler(auditLogService as AuditLogService);
      const message = {
         user: {
            id: 'admin-1',
            userId: 'admin-1',
            email: 'admin@example.com',
            roles: [DEFAULT_ROLES.ADMIN],
            permissions: [],
         },
         data: { id: 'audit-1' },
      };
      const result = await handler.execute(new GetAuditLogByIdCommand(message));

      expect(auditLogService.getAuditLogById).toHaveBeenCalledWith('audit-1');
      expect(result).toEqual({ id: 'audit-1' });
   });

   it('should execute GetAccountAuditLogsCommand', async () => {
      const handler = new GetAccountAuditLogsHandler(auditLogService as AuditLogService);
      const result = await handler.execute(new GetAccountAuditLogsCommand('acc-1', undefined, 1, 10));

      expect(auditLogService.getAccountAuditLogs).toHaveBeenCalledWith('acc-1', 1, 10);
      expect(result).toEqual({ data: [], total: 0 });
   });
});
