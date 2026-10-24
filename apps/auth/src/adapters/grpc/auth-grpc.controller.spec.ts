import { Test, TestingModule } from '@nestjs/testing';
import { firstValueFrom } from 'rxjs';
import { CommandBus, DEFAULT_ROLES, GrpcLoggingInterceptor, GrpcMetricsInterceptor, SYSTEM_ROLES } from '@common';
import { AUDIT_ACTIONS, AUDIT_STATUS, USER_STATUS } from '@contracts/auth';
import { AuthGrpcController } from '@auth/adapters/grpc/auth-grpc.controller';
import { CheckEmailCommand } from '@auth/commands/registration/check-email.command';

const TEST_PERMISSIONS = {
   AUTH_LOGIN: 'auth:login',
   AUTH_LOGOUT: 'auth:logout',
   CUSTOM_ACTION: 'supplier:create',
} as const;

describe('AuthGrpcController', () => {
   let controller: AuthGrpcController;
   let commandBus: jest.Mocked<CommandBus>;

   beforeEach(async () => {
      const mockCommandBus = {
         execute: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
         controllers: [AuthGrpcController],
         providers: [
            {
               provide: CommandBus,
               useValue: mockCommandBus,
            },
         ],
      }).compile();

      controller = module.get<AuthGrpcController>(AuthGrpcController);
      commandBus = module.get<CommandBus>(CommandBus) as jest.Mocked<CommandBus>;
   });

   it('should be defined', () => {
      expect(controller).toBeDefined();
   });

   it('should have GrpcLoggingInterceptor and GrpcMetricsInterceptor applied', () => {
      const interceptors = Reflect.getMetadata('__interceptors__', AuthGrpcController);
      expect(interceptors).toBeDefined();
      expect(interceptors).toContain(GrpcLoggingInterceptor);
      expect(interceptors).toContain(GrpcMetricsInterceptor);
   });

   describe('checkEmail', () => {
      it('should execute CheckEmailCommand and return availability result', async () => {
         const expectedResponse = {
            available: true,
            email: 'user@example.com',
         };
         commandBus.execute.mockResolvedValue(expectedResponse);

         const result = await firstValueFrom(controller.checkEmail({ email: 'user@example.com' }));

         expect(commandBus.execute).toHaveBeenCalledWith(new CheckEmailCommand('user@example.com'));
         expect(result).toEqual(expectedResponse);
      });

      it('should propagate error if command execution fails', async () => {
         const error = new Error('Email validation failed');
         commandBus.execute.mockRejectedValue(error);

         await expect(firstValueFrom(controller.checkEmail({ email: 'invalid-email' }))).rejects.toThrow(error);
      });
   });

   describe('login', () => {
      it('should execute LoginCommand and return formatted login response', async () => {
         const mockAuthResult = {
            user: {
               id: 'user-uuid-1',
               email: 'user@example.com',
               roles: [SYSTEM_ROLES.USER],
               status: USER_STATUS.ACTIVE,
               isEmailVerified: true,
               lastLoginAt: '2026-10-20T10:00:00.000Z',
               createdAt: '2026-01-01T00:00:00.000Z',
               updatedAt: '2026-10-20T10:00:00.000Z',
            },
            accessToken: 'access-token-xyz',
            refreshToken: 'refresh-token-xyz',
            tokens: {
               accessToken: 'access-token-xyz',
               refreshToken: 'refresh-token-xyz',
               tokenType: 'Bearer' as const,
               expiresIn: 3600,
            },
         };
         commandBus.execute.mockResolvedValue(mockAuthResult);

         const result = await firstValueFrom(
            controller.login({
               email: 'user@example.com',
               password: 'Password123!',
               deviceInfo: {
                  browser: 'Chrome',
                  ipAddress: '127.0.0.1',
               },
            }),
         );

         expect(commandBus.execute).toHaveBeenCalled();
         expect(result.accessToken).toBe('access-token-xyz');
         expect(result.refreshToken).toBe('refresh-token-xyz');
         expect(result.user.userId).toBe('user-uuid-1');
         expect(result.user.email).toBe('user@example.com');
         expect(result.tokens?.expiresIn).toBe(3600);
      });

      it('should handle login without deviceInfo and without tokens', async () => {
         const mockAuthResult = {
            user: {
               id: 'user-uuid-2',
               email: 'notokens@example.com',
               roles: [SYSTEM_ROLES.USER],
               createdAt: '2026-01-01T00:00:00.000Z',
            },
            accessToken: 'access-token-abc',
            refreshToken: 'refresh-token-abc',
         };
         commandBus.execute.mockResolvedValue(mockAuthResult);

         const result = await firstValueFrom(
            controller.login({
               email: 'notokens@example.com',
               password: 'Password123!',
            }),
         );

         expect(result.user.userId).toBe('user-uuid-2');
         expect(result.user.email).toBe('notokens@example.com');
         expect(result.tokens).toBeUndefined();
         expect(result.user.lastLoginAt).toBe('');
      });

      it('should propagate error if login command execution fails', async () => {
         const error = new Error('Invalid credentials');
         commandBus.execute.mockRejectedValue(error);

         await expect(
            firstValueFrom(
               controller.login({
                  email: 'wrong@example.com',
                  password: 'WrongPassword!',
               }),
            ),
         ).rejects.toThrow(error);
      });
   });

   describe('refreshToken', () => {
      it('should execute RefreshTokenCommand and return formatted refresh response', async () => {
         const mockAuthResult = {
            user: {
               id: 'user-uuid-1',
               email: 'user@example.com',
               roles: [SYSTEM_ROLES.USER],
               status: USER_STATUS.ACTIVE,
               isEmailVerified: true,
               lastLoginAt: '2026-10-20T10:00:00.000Z',
               createdAt: '2026-01-01T00:00:00.000Z',
               updatedAt: '2026-10-20T10:00:00.000Z',
            },
            accessToken: 'new-access-token-xyz',
            refreshToken: 'new-refresh-token-xyz',
            tokens: {
               accessToken: 'new-access-token-xyz',
               refreshToken: 'new-refresh-token-xyz',
               tokenType: 'Bearer' as const,
               expiresIn: 3600,
            },
         };
         commandBus.execute.mockResolvedValue(mockAuthResult);

         const result = await firstValueFrom(
            controller.refreshToken({
               refreshToken: 'valid-refresh-token',
               deviceInfo: {
                  browser: 'Firefox',
                  ipAddress: '192.168.1.1',
               },
            }),
         );

         expect(commandBus.execute).toHaveBeenCalled();
         expect(result.accessToken).toBe('new-access-token-xyz');
         expect(result.refreshToken).toBe('new-refresh-token-xyz');
         expect(result.user.userId).toBe('user-uuid-1');
         expect(result.tokens?.expiresIn).toBe(3600);
      });

      it('should propagate error if refresh token command execution fails', async () => {
         const error = new Error('Invalid refresh token');
         commandBus.execute.mockRejectedValue(error);

         await expect(
            firstValueFrom(
               controller.refreshToken({
                  refreshToken: 'invalid-refresh-token',
               }),
            ),
         ).rejects.toThrow(error);
      });
   });

   describe('Registration & OTP', () => {
      it('should execute sendRegisterOtp command successfully', async () => {
         const response = {
            success: true,
            message: 'OTP sent',
            cooldownSeconds: 60,
            expiresInMinutes: 5,
         };
         commandBus.execute.mockResolvedValue(response);

         const result = await firstValueFrom(controller.sendRegisterOtp({ email: 'new@example.com' }));

         expect(commandBus.execute).toHaveBeenCalled();
         expect(result.success).toBe(true);
         expect(result.cooldownSeconds).toBe(60);
      });

      it('should execute verifyRegisterOtp command successfully', async () => {
         const response = {
            success: true,
            verificationToken: 'vtok_123',
            expiresInSeconds: 900,
         };
         commandBus.execute.mockResolvedValue(response);

         const result = await firstValueFrom(controller.verifyRegisterOtp({ email: 'new@example.com', otp: '123456' }));

         expect(commandBus.execute).toHaveBeenCalled();
         expect(result.verificationToken).toBe('vtok_123');
      });

      it('should execute register command and return login response', async () => {
         const mockAuthResult = {
            user: {
               id: 'user-new',
               email: 'registered@example.com',
               roles: [SYSTEM_ROLES.USER],
               createdAt: '2026-10-22T00:00:00.000Z',
            },
            accessToken: 'reg-access-token',
            refreshToken: 'reg-refresh-token',
         };
         commandBus.execute.mockResolvedValue(mockAuthResult);

         const result = await firstValueFrom(
            controller.register({
               email: 'registered@example.com',
               password: 'Password123!',
               verificationToken: 'vtok_123',
            }),
         );

         expect(commandBus.execute).toHaveBeenCalled();
         expect(result.user.userId).toBe('user-new');
         expect(result.accessToken).toBe('reg-access-token');
      });
   });

   describe('Session Management & Revocation', () => {
      it('should getSessions and format with explicit sessionId', async () => {
         const sessions = [
            {
               id: 'sess-1',
               deviceType: 'desktop',
               deviceName: 'MacBook',
               isCurrent: true,
               lastActiveAt: '2026-10-22T00:00:00.000Z',
               expiresAt: '2026-10-29T00:00:00.000Z',
               createdAt: '2026-10-22T00:00:00.000Z',
            },
         ];
         commandBus.execute.mockResolvedValue(sessions);

         const result = await firstValueFrom(controller.getSessions({ userId: 'user-1' }));

         expect(commandBus.execute).toHaveBeenCalled();
         expect(result.sessions[0].sessionId).toBe('sess-1');
         expect(result.sessions[0].isCurrent).toBe(true);
      });

      it('should revokeSession successfully', async () => {
         commandBus.execute.mockResolvedValue({ success: true });

         const result = await firstValueFrom(controller.revokeSession({ userId: 'user-1', sessionId: 'sess-1' }));

         expect(commandBus.execute).toHaveBeenCalled();
         expect(result.success).toBe(true);
      });

      it('should revokeOtherSessions successfully', async () => {
         commandBus.execute.mockResolvedValue({ success: true, revokedCount: 2 });

         const result = await firstValueFrom(controller.revokeOtherSessions({ userId: 'user-1', currentJti: 'jti-1' }));

         expect(commandBus.execute).toHaveBeenCalled();
         expect(result.revokedCount).toBe(2);
      });

      it('should revokeToken successfully', async () => {
         commandBus.execute.mockResolvedValue({ success: true });

         const result = await firstValueFrom(controller.revokeToken({ token: 'jwt-token' }));

         expect(commandBus.execute).toHaveBeenCalled();
         expect(result.success).toBe(true);
      });

      it('should revokeAllUserTokens successfully', async () => {
         commandBus.execute.mockResolvedValue({ success: true });

         const result = await firstValueFrom(controller.revokeAllUserTokens({ userId: 'user-1' }));

         expect(commandBus.execute).toHaveBeenCalled();
         expect(result.success).toBe(true);
      });

      it('should logoutAll successfully', async () => {
         commandBus.execute.mockResolvedValue({ success: true });

         const result = await firstValueFrom(controller.logoutAll({ userId: 'user-1' }));

         expect(commandBus.execute).toHaveBeenCalled();
         expect(result.success).toBe(true);
      });

      it('should validateToken and return explicit userId', async () => {
         commandBus.execute.mockResolvedValue({
            valid: true,
            user: {
               id: 'user-valid',
               email: 'valid@example.com',
               roles: [SYSTEM_ROLES.USER],
               createdAt: '2026-10-22T00:00:00.000Z',
            },
         });

         const result = await firstValueFrom(controller.validateToken({ token: 'valid-token' }));

         expect(commandBus.execute).toHaveBeenCalled();
         expect(result.valid).toBe(true);
         expect(result.user?.userId).toBe('user-valid');
      });
   });

   describe('Password Management', () => {
      it('should changePassword and return response', async () => {
         commandBus.execute.mockResolvedValue({
            success: true,
            message: 'OTP sent',
            cooldownSeconds: 60,
            expiresInMinutes: 10,
         });

         const result = await firstValueFrom(
            controller.changePassword({
               userId: 'user-1',
               currentPassword: 'OldPassword123!',
               newPassword: 'NewPassword123!',
               confirmPassword: 'NewPassword123!',
            }),
         );

         expect(commandBus.execute).toHaveBeenCalled();
         expect(result.success).toBe(true);
      });

      it('should verifyChangePasswordOtp successfully', async () => {
         commandBus.execute.mockResolvedValue({
            success: true,
            message: 'Password changed',
            logoutAll: true,
         });

         const result = await firstValueFrom(
            controller.verifyChangePasswordOtp({
               userId: 'user-1',
               otp: '123456',
            }),
         );

         expect(commandBus.execute).toHaveBeenCalled();
         expect(result.success).toBe(true);
         expect(result.logoutAll).toBe(true);
      });
   });

   describe('Audit Logs, JWKS, Email & RBAC', () => {
      it('should getUserAuditLogs with explicit auditLogId', async () => {
         commandBus.execute.mockResolvedValue({
            data: [
               {
                  auditLogId: 'audit-1',
                  accountId: 'user-1',
                  action: AUDIT_ACTIONS.AUTH_LOGIN_SUCCESS,
                  status: AUDIT_STATUS.SUCCESS,
                  createdAt: new Date('2026-10-22T00:00:00.000Z'),
               },
            ],
            total: 1,
            page: 1,
            limit: 10,
            totalPages: 1,
         });

         const result = await firstValueFrom(controller.getUserAuditLogs({ userId: 'user-1', page: 1, limit: 10 }));

         expect(commandBus.execute).toHaveBeenCalled();
         expect(result.items[0].auditLogId).toBe('audit-1');
         expect(result.items[0].userId).toBe('user-1');
      });

      it('should getAuditLogs with filters and authorization context', async () => {
         commandBus.execute.mockResolvedValue({
            data: [],
            total: 0,
            page: 1,
            limit: 10,
            totalPages: 0,
         });

         const result = await firstValueFrom(
            controller.getAuditLogs({
               page: 1,
               limit: 10,
               requestingUserId: 'admin-1',
               requestingRoles: [DEFAULT_ROLES.ADMIN],
            }),
         );

         expect(commandBus.execute).toHaveBeenCalled();
         expect(result.total).toBe(0);
      });

      it('should getAuditLogById with explicit auditLogId', async () => {
         commandBus.execute.mockResolvedValue({
            auditLogId: 'audit-detail-1',
            accountId: 'user-1',
            action: AUDIT_ACTIONS.AUTH_PASSWORD_CHANGE,
            status: AUDIT_STATUS.SUCCESS,
            createdAt: '2026-10-22T00:00:00.000Z',
         });

         const result = await firstValueFrom(
            controller.getAuditLogById({
               auditLogId: 'audit-detail-1',
               requestingUserId: 'admin-1',
            }),
         );

         expect(commandBus.execute).toHaveBeenCalled();
         expect(result.auditLog?.auditLogId).toBe('audit-detail-1');
      });

      it('should getJwks and serialize to keysJson', async () => {
         commandBus.execute.mockResolvedValue({
            keys: [{ kty: 'RSA', kid: 'key-1' }],
         });

         const result = await firstValueFrom(controller.getJwks({}));

         expect(commandBus.execute).toHaveBeenCalled();
         const parsed = JSON.parse(result.keysJson);
         expect(parsed.keys[0].kid).toBe('key-1');
      });

      it('should getEmail for accountId', async () => {
         commandBus.execute.mockResolvedValue({
            accountId: 'acc-1',
            email: 'found@example.com',
         });

         const result = await firstValueFrom(controller.getEmail({ accountId: 'acc-1' }));

         expect(commandBus.execute).toHaveBeenCalled();
         expect(result.email).toBe('found@example.com');
      });

      it('should getRolePermissions for roleCode', async () => {
         commandBus.execute.mockResolvedValue([TEST_PERMISSIONS.AUTH_LOGIN, TEST_PERMISSIONS.AUTH_LOGOUT]);

         const result = await firstValueFrom(controller.getRolePermissions({ roleCode: SYSTEM_ROLES.USER }));

         expect(commandBus.execute).toHaveBeenCalled();
         expect(result.permissions).toEqual([TEST_PERMISSIONS.AUTH_LOGIN, TEST_PERMISSIONS.AUTH_LOGOUT]);
      });

      it('should registerServicePermissions and return registered count', async () => {
         commandBus.execute.mockResolvedValue(2);

         const result = await firstValueFrom(
            controller.registerServicePermissions({
               serviceName: 'supplier',
               permissions: [
                  {
                     code: TEST_PERMISSIONS.CUSTOM_ACTION,
                     name: 'Create Supplier',
                     description: 'Supplier creation permission',
                  },
               ],
            }),
         );

         expect(commandBus.execute).toHaveBeenCalled();
         expect(result.upsertedCount).toBe(2);
         expect(result.success).toBe(true);
      });
   });
});
