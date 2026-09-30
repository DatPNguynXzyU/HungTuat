import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { AUTH_PATTERNS, SERVICES } from '@common';
import { AuditLogsService } from '@/modules/audit-logs/audit-logs.service';
import type { JwtPayload } from '@common';

describe('AuditLogsService', () => {
   let service: AuditLogsService;
   const mockAuthClient = {
      send: jest.fn(),
   };
   const mockUser: JwtPayload = {
      sub: 'user-admin-1',
      email: 'admin@example.com',
      roles: ['admin'],
      jti: 'session-123',
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

   it('should call authClient to get audit logs with user context', async () => {
      const mockResult = {
         data: [{ id: 'audit-1', action: 'AUTH.LOGIN_SUCCESS' }],
         total: 1,
         page: 1,
         limit: 10,
         totalPages: 1,
      };
      mockAuthClient.send.mockReturnValue(of(mockResult));

      const result = await service.getAuditLogs({ page: 1, limit: 10 }, mockUser);
      expect(mockAuthClient.send).toHaveBeenCalledWith(
         { cmd: AUTH_PATTERNS.GET_AUDIT_LOGS },
         {
            data: { page: 1, limit: 10 },
            user: {
               userId: mockUser.sub,
               email: mockUser.email,
               roles: mockUser.roles,
               permissions: [],
               sessionId: mockUser.jti,
            },
         },
      );
      expect(result).toEqual(mockResult);
   });

   it('should call authClient to get audit log by ID with user context', async () => {
      const mockLog = { id: 'audit-1', action: 'AUTH.LOGIN_SUCCESS' };
      mockAuthClient.send.mockReturnValue(of(mockLog));

      const result = await service.getAuditLogById('audit-1', mockUser);
      expect(mockAuthClient.send).toHaveBeenCalledWith(
         { cmd: AUTH_PATTERNS.GET_AUDIT_LOG_BY_ID },
         {
            data: { id: 'audit-1' },
            user: {
               userId: mockUser.sub,
               email: mockUser.email,
               roles: mockUser.roles,
               permissions: [],
               sessionId: mockUser.jti,
            },
         },
      );
      expect(result).toEqual(mockLog);
   });
});
