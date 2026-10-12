import { Test, TestingModule } from '@nestjs/testing';
import { AuditStatus } from '@auth/prisma-client';
import { PrismaService } from '@auth/prisma/prisma.service';
import { AuditLogRepository } from '@auth/repositories/audit-log.repository';

describe('AuditLogRepository', () => {
   let repository: AuditLogRepository;

   const sampleAuditLog = {
      auditLogId: 'audit-id-1',
      accountId: 'account-id-1',
      actorEmail: 'test@example.com',
      action: 'AUTH.LOGIN_SUCCESS',
      status: AuditStatus.SUCCESS,
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0...',
      deviceType: 'desktop',
      deviceName: 'Chrome on macOS',
      browser: 'Chrome 122.0',
      os: 'macOS 14.3',
      city: 'Ho Chi Minh City',
      country: 'Vietnam',
      reason: null,
      metadata: { key: 'value' },
      createdAt: new Date('2026-09-28T00:00:00.000Z'),
   };

   const mockSecurityAuditLogCreate = jest.fn();
   const mockSecurityAuditLogFindUnique = jest.fn();
   const mockSecurityAuditLogFindMany = jest.fn();
   const mockSecurityAuditLogCount = jest.fn();

   const mockPrismaService = {
      securityAuditLog: {
         create: mockSecurityAuditLogCreate,
         findUnique: mockSecurityAuditLogFindUnique,
         findMany: mockSecurityAuditLogFindMany,
         count: mockSecurityAuditLogCount,
      },
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            AuditLogRepository,
            {
               provide: PrismaService,
               useValue: mockPrismaService,
            },
         ],
      }).compile();

      repository = module.get<AuditLogRepository>(AuditLogRepository);
   });

   it('should create an audit log entity with sanitized metadata', async () => {
      mockSecurityAuditLogCreate.mockResolvedValue(sampleAuditLog);

      const result = await repository.createAuditLog({
         accountId: 'user-id-1',
         actorEmail: 'test@example.com',
         action: 'AUTH.LOGIN_SUCCESS',
         status: AuditStatus.SUCCESS,
         ipAddress: '127.0.0.1',
         metadata: { password: 'secretPassword', safe: 'data' },
      });

      expect(result.id).toBe('audit-id-1');
      expect(result.action).toBe('AUTH.LOGIN_SUCCESS');
      expect(mockSecurityAuditLogCreate).toHaveBeenCalled();
   });

   it('should find audit logs with pagination and filters', async () => {
      mockSecurityAuditLogFindMany.mockResolvedValue([sampleAuditLog]);
      mockSecurityAuditLogCount.mockResolvedValue(1);

      const result = await repository.findAuditLogs({
         accountId: 'account-id-1',
         actorEmail: 'test@example.com',
         page: 1,
         limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
   });

   it('should find an audit log by ID', async () => {
      mockSecurityAuditLogFindUnique.mockResolvedValue(sampleAuditLog);

      const result = await repository.findById('audit-id-1');

      expect(result?.id).toBe('audit-id-1');
      expect(mockSecurityAuditLogFindUnique).toHaveBeenCalledWith({
         where: { auditLogId: 'audit-id-1' },
      });
   });

   it('should find account audit logs', async () => {
      mockSecurityAuditLogFindMany.mockResolvedValue([sampleAuditLog]);
      mockSecurityAuditLogCount.mockResolvedValue(1);

      const result = await repository.findAccountAuditLogs('account-id-1', 1, 10);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].accountId).toBe('account-id-1');
   });
});
