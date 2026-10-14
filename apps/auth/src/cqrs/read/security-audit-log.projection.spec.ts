import { Test, type TestingModule } from '@nestjs/testing';
import { SecurityAuditLogProjection } from '@auth/cqrs/read/security-audit-log.projection';
import { AUDIT_LOG_REPOSITORY } from '@auth/repositories/audit-log.repository.interface';
import { AuditStatus } from '@auth/prisma-client';
import { AUDIT_ACTIONS } from '@common';
import type { CreateAuditLogData, SecurityAuditLogEntity } from '@auth/entities/audit-log.entity';

describe('SecurityAuditLogProjection', () => {
   let projection: SecurityAuditLogProjection;
   let auditLogRepository: {
      createAuditLog: jest.Mock;
      findAuditLogs: jest.Mock;
      findById: jest.Mock;
      findAccountAuditLogs: jest.Mock;
   };

   beforeEach(async () => {
      auditLogRepository = {
         createAuditLog: jest.fn(),
         findAuditLogs: jest.fn(),
         findById: jest.fn(),
         findAccountAuditLogs: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
         providers: [SecurityAuditLogProjection, { provide: AUDIT_LOG_REPOSITORY, useValue: auditLogRepository }],
      }).compile();

      projection = module.get<SecurityAuditLogProjection>(SecurityAuditLogProjection);
   });

   it('should successfully project audit event into audit repository', async () => {
      const event: CreateAuditLogData = {
         id: 'audit-1',
         accountId: 'acc-1',
         action: AUDIT_ACTIONS.AUTH_LOGIN_SUCCESS,
         status: AuditStatus.SUCCESS,
      };

      const mockEntity: SecurityAuditLogEntity = {
         id: 'audit-1',
         accountId: 'acc-1',
         action: AUDIT_ACTIONS.AUTH_LOGIN_SUCCESS,
         status: AuditStatus.SUCCESS,
         createdAt: new Date().toISOString(),
      };

      auditLogRepository.createAuditLog.mockResolvedValue(mockEntity);

      const result = await projection.project(event);

      expect(auditLogRepository.createAuditLog).toHaveBeenCalledWith(event);
      expect(result).toEqual(mockEntity);
   });

   it('should catch error gracefully and return null when repository fails', async () => {
      const event: CreateAuditLogData = {
         id: 'audit-2',
         action: AUDIT_ACTIONS.AUTH_LOGIN_FAILED,
      };

      auditLogRepository.createAuditLog.mockRejectedValue(new Error('DB connection lost'));

      const result = await projection.project(event);

      expect(result).toBeNull();
   });
});
