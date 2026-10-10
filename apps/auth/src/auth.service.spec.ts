import { Test, TestingModule } from '@nestjs/testing';
import {
   Argon2Util,
   AUDIT_ACTIONS,
   AUDIT_STATUS,
   BadRequestException,
   DEFAULT_ROLES,
   JWT_TOKEN_TYPE,
   NOTIFICATION_EVENTS,
   NOTIFICATION_PATTERNS,
   NotFoundException,
   RbacCacheService,
   REDIS_KEY_PREFIX,
   RedisService,
   SERVICES,
   UnauthorizedException,
   USER_STATUS,
} from '@common';
import { AuthService } from '@auth/auth.service';
import { AuthConfigService } from '@auth/config';
import type { CreateAccountData } from '@auth/entities/account.entity';
import { OutboxPublisherService } from '@auth/outbox/services/outbox-publisher.service';
import { AUTH_REPOSITORY } from '@auth/repositories';
import { AuditLogService } from '@auth/services/audit-log.service';
import { EmailBloomFilterService } from '@auth/services/email-bloom-filter.service';
import { TOKEN_SERVICE } from '@auth/services/token.service.interface';

describe('AuthService', () => {
   let service: AuthService;
   const mockFindByEmail = jest.fn();
   const mockFindById = jest.fn();
   const mockFindEmailById = jest.fn();
   const mockFindAllEmails = jest.fn();
   const mockCreateAccount = jest.fn();
   const mockUpdateAccount = jest.fn();
   const mockDeleteAccount = jest.fn();
   const mockFindRoleByCode = jest.fn();
   const mockAssignRoleToAccount = jest.fn();

   const mockGetRole = jest.fn();
   const mockSetRole = jest.fn();
   const mockGetRolePermissions = jest.fn();
   const mockSetRolePermissions = jest.fn();

   const mockGetJwks = jest.fn();
   const mockGenerateTokenPair = jest.fn();
   const mockRotateTokenPair = jest.fn();
   const mockValidateAccessToken = jest.fn();
   const mockValidateRefreshToken = jest.fn();
   const mockRevokeToken = jest.fn();
   const mockRevokeAllAccountTokens = jest.fn();
   const mockLogoutAll = jest.fn();
   const mockInvalidateRefreshToken = jest.fn();
   const mockGetActiveSessions = jest.fn();
   const mockRevokeSession = jest.fn();
   const mockRevokeOtherSessions = jest.fn();
   const mockGenerateVerificationToken = jest.fn().mockImplementation((email: string) => {
      const token = 'vtok_123456';
      redisStore.set(`${REDIS_KEY_PREFIX.OTP_VERIFICATION_TOKEN}${token}`, email);
      return Promise.resolve(token);
   });
   const mockValidateVerificationToken = jest.fn().mockImplementation((token: string) => {
      return Promise.resolve(redisStore.get(`${REDIS_KEY_PREFIX.OTP_VERIFICATION_TOKEN}${token}`) || null);
   });
   const mockConsumeVerificationToken = jest.fn().mockImplementation((token: string) => {
      const email = redisStore.get(`${REDIS_KEY_PREFIX.OTP_VERIFICATION_TOKEN}${token}`) || null;
      redisStore.delete(`${REDIS_KEY_PREFIX.OTP_VERIFICATION_TOKEN}${token}`);
      return Promise.resolve(email);
   });

   const mockMightContain = jest.fn().mockResolvedValue(true);
   const mockAddEmail = jest.fn().mockResolvedValue(undefined);
   const mockIsEmailAvailable = jest.fn().mockResolvedValue(true);

   const mockEmailBloomFilterService = {
      mightContain: mockMightContain,
      addEmail: mockAddEmail,
      isEmailAvailable: mockIsEmailAvailable,
   };

   const mockAuditLogRecord = jest.fn().mockResolvedValue(null);
   const mockAuditLogService = {
      record: mockAuditLogRecord,
      getAuditLogs: jest.fn(),
      getAuditLogById: jest.fn(),
      getUserAuditLogs: jest.fn(),
   };

   const mockNotificationClient = {
      emit: jest.fn(),
   };

   const redisStore = new Map<string, string>();
   const mockRedisService = {
      get: jest.fn().mockImplementation((key: string) => Promise.resolve(redisStore.get(key) || null)),
      set: jest.fn().mockImplementation((key: string, value: string) => {
         redisStore.set(key, value);
         return Promise.resolve();
      }),
      del: jest.fn().mockImplementation((key: string) => {
         redisStore.delete(key);
         return Promise.resolve(1);
      }),
      incr: jest.fn().mockImplementation((key: string) => {
         const current = Number(redisStore.get(key) || 0) + 1;
         redisStore.set(key, String(current));
         return Promise.resolve(current);
      }),
      ttl: jest.fn().mockImplementation((key: string) => {
         return Promise.resolve(redisStore.has(key) ? 900 : -2);
      }),
      expire: jest.fn().mockResolvedValue(undefined),
      deleteByPattern: jest.fn().mockResolvedValue(0),
      getJson: jest.fn().mockImplementation((key: string) => {
         const val = redisStore.get(key);
         return Promise.resolve(val ? JSON.parse(val) : null);
      }),
      setJson: jest.fn().mockImplementation((key: string, value: unknown) => {
         redisStore.set(key, JSON.stringify(value));
         return Promise.resolve();
      }),
   };

   const mockOutboxPublisherService = {
      triggerPublish: jest.fn(),
      publishPendingEvents: jest.fn().mockResolvedValue(0),
   };

   beforeEach(async () => {
      jest.clearAllMocks();
      redisStore.clear();
      mockMightContain.mockResolvedValue(true);

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            AuthService,
            {
               provide: AUTH_REPOSITORY,
               useValue: {
                  findByEmail: mockFindByEmail,
                  findById: mockFindById,
                  findEmailById: mockFindEmailById,
                  findAllEmails: mockFindAllEmails,
                  createAccount: mockCreateAccount,
                  updateAccount: mockUpdateAccount,
                  deleteAccount: mockDeleteAccount,
                  findRoleByCode: mockFindRoleByCode,
                  assignRoleToAccount: mockAssignRoleToAccount,
               },
            },
            {
               provide: EmailBloomFilterService,
               useValue: mockEmailBloomFilterService,
            },
            {
               provide: OutboxPublisherService,
               useValue: mockOutboxPublisherService,
            },
            {
               provide: AuditLogService,
               useValue: mockAuditLogService,
            },
            {
               provide: RbacCacheService,
               useValue: {
                  getRole: mockGetRole,
                  setRole: mockSetRole,
                  getRolePermissions: mockGetRolePermissions,
                  setRolePermissions: mockSetRolePermissions,
               },
            },
            {
               provide: TOKEN_SERVICE,
               useValue: {
                  getJwks: mockGetJwks,
                  generateTokenPair: mockGenerateTokenPair,
                  rotateTokenPair: mockRotateTokenPair,
                  validateAccessToken: mockValidateAccessToken,
                  validateRefreshToken: mockValidateRefreshToken,
                  revokeToken: mockRevokeToken,
                  revokeAllAccountTokens: mockRevokeAllAccountTokens,
                  logoutAll: mockLogoutAll,
                  invalidateRefreshToken: mockInvalidateRefreshToken,
                  getActiveSessions: mockGetActiveSessions,
                  revokeSession: mockRevokeSession,
                  revokeOtherSessions: mockRevokeOtherSessions,
                  generateVerificationToken: mockGenerateVerificationToken,
                  validateVerificationToken: mockValidateVerificationToken,
                  consumeVerificationToken: mockConsumeVerificationToken,
               },
            },
            {
               provide: RedisService,
               useValue: mockRedisService,
            },
            {
               provide: SERVICES.NOTIFICATION_SERVICE,
               useValue: mockNotificationClient,
            },
            {
               provide: AuthConfigService,
               useValue: {
                  argon2Secret: undefined,
                  jwtAccessTokenExpiresIn: 900,
               },
            },
         ],
      }).compile();

      service = module.get<AuthService>(AuthService);
   });

   it('should be defined', () => {
      expect(service).toBeDefined();
   });

   it('should return jwks by delegating to TokenService', () => {
      mockGetJwks.mockReturnValue({
         keys: [{ kty: 'RSA', alg: 'RS256', use: 'sig', kid: 'kid-1' }],
      });

      const jwks = service.getJwks();
      expect(mockGetJwks).toHaveBeenCalled();
      expect(jwks.keys.length).toBe(1);
   });

   it('should check email availability via EmailBloomFilterService', async () => {
      mockIsEmailAvailable.mockResolvedValue(true);

      const result = await service.checkEmail('test@example.com');

      expect(mockIsEmailAvailable).toHaveBeenCalledWith('test@example.com');
      expect(result).toEqual({ available: true, email: 'test@example.com' });
   });

   describe('sendRegisterOtp', () => {
      it('should send OTP email and save to redis when email is available', async () => {
         mockIsEmailAvailable.mockResolvedValue(true);
         mockRedisService.ttl.mockResolvedValue(-2); // No cooldown

         const result = await service.sendRegisterOtp({ email: 'newUser@example.com' });

         expect(mockIsEmailAvailable).toHaveBeenCalledWith('newuser@example.com');
         expect(mockNotificationClient.emit).toHaveBeenCalledWith(
            NOTIFICATION_PATTERNS.SEND_OTP_EMAIL,
            expect.objectContaining({
               to: 'newuser@example.com',
               expiresInMinutes: 5,
            }),
         );
         expect(mockAuditLogRecord).toHaveBeenCalledWith(
            expect.objectContaining({
               actorEmail: 'newuser@example.com',
               action: AUDIT_ACTIONS.AUTH_OTP_SENT,
               status: AUDIT_STATUS.SUCCESS,
            }),
         );
         expect(result.success).toBe(true);
         expect(result.cooldownSeconds).toBe(60);
      });

      it('should throw BadRequestException if email already exists', async () => {
         mockIsEmailAvailable.mockResolvedValue(false);

         await expect(service.sendRegisterOtp({ email: 'taken@example.com' })).rejects.toThrow(BadRequestException);

         expect(mockAuditLogRecord).toHaveBeenCalledWith(
            expect.objectContaining({
               actorEmail: 'taken@example.com',
               action: AUDIT_ACTIONS.AUTH_OTP_FAILED,
               status: AUDIT_STATUS.FAILURE,
            }),
         );
         expect(mockNotificationClient.emit).not.toHaveBeenCalled();
      });

      it('should throw BadRequestException if cooldown is active', async () => {
         mockIsEmailAvailable.mockResolvedValue(true);
         mockRedisService.ttl.mockResolvedValue(45); // 45 seconds cooldown remaining

         await expect(service.sendRegisterOtp({ email: 'cooldown@example.com' })).rejects.toThrow(BadRequestException);
         expect(mockNotificationClient.emit).not.toHaveBeenCalled();
      });
   });

   describe('verifyRegisterOtp', () => {
      it('should return verification token when OTP matches', async () => {
         const email = 'verify@example.com';
         redisStore.set(`${REDIS_KEY_PREFIX.OTP_REGISTER}${email}`, '123456');

         const result = await service.verifyRegisterOtp({ email, otp: '123456' });

         expect(result.success).toBe(true);
         expect(result.verificationToken).toMatch(/^vtok_/);
         expect(redisStore.has(`${REDIS_KEY_PREFIX.OTP_REGISTER}${email}`)).toBe(false);
         expect(mockAuditLogRecord).toHaveBeenCalledWith(
            expect.objectContaining({
               actorEmail: email,
               action: AUDIT_ACTIONS.AUTH_OTP_VERIFIED,
               status: AUDIT_STATUS.SUCCESS,
            }),
         );
      });

      it('should throw BadRequestException if OTP is expired or not found', async () => {
         await expect(service.verifyRegisterOtp({ email: 'expired@example.com', otp: '123456' })).rejects.toThrow(
            BadRequestException,
         );
      });

      it('should throw BadRequestException if OTP is wrong', async () => {
         const email = 'wrong@example.com';
         redisStore.set(`${REDIS_KEY_PREFIX.OTP_REGISTER}${email}`, '123456');

         await expect(service.verifyRegisterOtp({ email, otp: '654321' })).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequestException and delete OTP when max attempts exceeded', async () => {
         const email = 'maxattempts@example.com';
         redisStore.set(`${REDIS_KEY_PREFIX.OTP_REGISTER}${email}`, '123456');
         redisStore.set(`${REDIS_KEY_PREFIX.OTP_REGISTER_ATTEMPTS}${email}`, '5');

         await expect(service.verifyRegisterOtp({ email, otp: '111111' })).rejects.toThrow(BadRequestException);

         expect(redisStore.has(`${REDIS_KEY_PREFIX.OTP_REGISTER}${email}`)).toBe(false);
      });
   });

   it('should bypass DB check if Bloom filter returns false on register', async () => {
      mockMightContain.mockResolvedValue(false);
      mockGetRole.mockResolvedValue({
         id: 'role-user-id',
         code: DEFAULT_ROLES.USER,
         name: 'Standard User',
         permissions: ['USERS:READ'],
      });
      mockCreateAccount.mockResolvedValue({
         id: 'user-id-123',
         email: 'brandnew@example.com',
         roles: [DEFAULT_ROLES.USER],
         status: USER_STATUS.ACTIVE,
         isEmailVerified: false,
         createdAt: '2026-09-30T00:00:00.000Z',
      });
      mockGenerateTokenPair.mockResolvedValue({
         accessToken: 'token-a',
         refreshToken: 'token-b',
      });

      await service.register({
         email: 'brandnew@example.com',
         password: 'password123',
         confirmPassword: 'password123',
      });

      expect(mockFindByEmail).not.toHaveBeenCalled();
      expect(mockAddEmail).toHaveBeenCalledWith('brandnew@example.com');
   });

   it('should register with verificationToken and mark isEmailVerified as true', async () => {
      const email = 'verifieduser@example.com';
      const vtoken = 'vtok_abc123';
      redisStore.set(`${REDIS_KEY_PREFIX.OTP_VERIFICATION_TOKEN}${vtoken}`, email);

      mockMightContain.mockResolvedValue(false);
      mockGetRole.mockResolvedValue({
         id: 'role-user-id',
         code: DEFAULT_ROLES.USER,
         name: 'Standard User',
         permissions: ['USERS:READ'],
      });
      mockCreateAccount.mockResolvedValue({
         id: 'user-id-123',
         email,
         roles: [DEFAULT_ROLES.USER],
         status: USER_STATUS.ACTIVE,
         isEmailVerified: true,
         createdAt: '2026-09-30T00:00:00.000Z',
      });
      mockGenerateTokenPair.mockResolvedValue({
         accessToken: 'token-a',
         refreshToken: 'token-b',
      });

      const res = await service.register({
         email,
         password: 'password123',
         confirmPassword: 'password123',
         verificationToken: vtoken,
      });

      expect(mockCreateAccount).toHaveBeenCalledWith(
         expect.objectContaining({
            isEmailVerified: true,
         }),
         expect.any(Object),
      );
      expect(redisStore.has(`${REDIS_KEY_PREFIX.OTP_VERIFICATION_TOKEN}${vtoken}`)).toBe(false);
      expect(res.user.isEmailVerified).toBe(true);
   });

   it('should throw BadRequestException if verificationToken is invalid on register', async () => {
      const email = 'verifieduser@example.com';
      mockConsumeVerificationToken.mockResolvedValueOnce(null);
      await expect(
         service.register({
            email,
            password: 'password123',
            confirmPassword: 'password123',
            verificationToken: 'vtok_invalid',
         }),
      ).rejects.toThrow(BadRequestException);
   });

   it('should throw BadRequestException with AUTH.EMAIL_ALREADY_EXISTS and record audit log if email already exists on register', async () => {
      mockMightContain.mockResolvedValue(true);
      mockFindByEmail.mockResolvedValue({
         id: 'existing-id',
         email: 'test@example.com',
         passwordHash: 'hash',
         createdAt: new Date().toISOString(),
      });

      await expect(
         service.register({
            email: 'test@example.com',
            password: 'password123',
            confirmPassword: 'password123',
         }),
      ).rejects.toThrow(BadRequestException);

      expect(mockAuditLogRecord).toHaveBeenCalledWith(
         expect.objectContaining({
            action: AUDIT_ACTIONS.AUTH_REGISTER,
            status: AUDIT_STATUS.FAILURE,
            actorEmail: 'test@example.com',
         }),
      );
   });

   it('should call repository.createAccount with outbox event and audit log on register and trigger publisher', async () => {
      mockFindByEmail.mockResolvedValue(null);
      mockGetRole.mockResolvedValue({
         id: 'role-user-id',
         code: DEFAULT_ROLES.USER,
         name: 'Standard User',
         permissions: ['USERS:READ'],
      });

      mockCreateAccount.mockImplementation((data: CreateAccountData) =>
         Promise.resolve({
            id: '01923456-789a-7bc4-8901-234567890abc',
            email: data.email,
            passwordHash: data.passwordHash,
            status: USER_STATUS.ACTIVE,
            isEmailVerified: false,
            lastLoginAt: null,
            version: 1,
            roles: [DEFAULT_ROLES.USER],
            createdAt: '2026-09-26T00:00:00.000Z',
         }),
      );

      mockGenerateTokenPair.mockResolvedValue({
         accessToken: 'mock-access-token',
         refreshToken: 'mock-refresh-token',
      });

      const res = await service.register({
         email: 'new@example.com',
         password: 'password123',
         confirmPassword: 'password123',
      });

      expect(mockCreateAccount).toHaveBeenCalledWith(
         expect.objectContaining({
            email: 'new@example.com',
            roleId: 'role-user-id',
            status: USER_STATUS.ACTIVE,
            isEmailVerified: false,
         }),
         expect.objectContaining({
            aggregateType: 'ACCOUNT',
            eventType: NOTIFICATION_EVENTS.USER_REGISTERED,
            payload: {
               email: 'new@example.com',
            },
         }),
      );
      expect(mockAddEmail).toHaveBeenCalledWith('new@example.com');
      expect(mockOutboxPublisherService.triggerPublish).toHaveBeenCalled();
      expect(mockAuditLogRecord).toHaveBeenCalledWith(
         expect.objectContaining({
            accountId: '01923456-789a-7bc4-8901-234567890abc',
            actorEmail: 'new@example.com',
            action: AUDIT_ACTIONS.AUTH_REGISTER,
            status: AUDIT_STATUS.SUCCESS,
         }),
      );
      expect(res.user.id).toBe('01923456-789a-7bc4-8901-234567890abc');
      expect(res.accessToken).toBe('mock-access-token');
      expect(res.refreshToken).toBe('mock-refresh-token');
   });

   it('should login successfully when credentials match, record audit log, reset failed attempts and update lastLoginAt', async () => {
      const passwordHash = await Argon2Util.hash('password123');
      mockFindByEmail.mockResolvedValue({
         id: '01923456-789a-7bc4-8901-234567890abc',
         email: 'login@example.com',
         passwordHash,
         status: USER_STATUS.ACTIVE,
         isEmailVerified: true,
         roles: [DEFAULT_ROLES.USER],
         createdAt: '2026-09-26T00:00:00.000Z',
      });

      mockGenerateTokenPair.mockResolvedValue({
         accessToken: 'mock-access-token',
         refreshToken: 'mock-refresh-token',
      });

      const res = await service.login({
         email: 'login@example.com',
         password: 'password123',
         ip: '192.168.1.50',
      });

      expect(mockFindByEmail).toHaveBeenCalledWith('login@example.com');
      expect(mockRedisService.del).toHaveBeenCalledWith(
         `${REDIS_KEY_PREFIX.FAILED_LOGIN_ATTEMPTS}login@example.com:192.168.1.50`,
      );
      expect(mockRedisService.del).toHaveBeenCalledWith(`${REDIS_KEY_PREFIX.LOCKOUT}login@example.com:192.168.1.50`);
      expect(mockUpdateAccount).toHaveBeenCalledTimes(1);
      expect(mockAuditLogRecord).toHaveBeenCalledWith(
         expect.objectContaining({
            accountId: '01923456-789a-7bc4-8901-234567890abc',
            actorEmail: 'login@example.com',
            action: AUDIT_ACTIONS.AUTH_LOGIN_SUCCESS,
            status: AUDIT_STATUS.SUCCESS,
            ipAddress: '192.168.1.50',
         }),
      );
      expect(res.user.email).toBe('login@example.com');
      expect(res.accessToken).toBe('mock-access-token');
      expect(res.refreshToken).toBe('mock-refresh-token');
   });

   it('should record failed login audit log when password is wrong', async () => {
      const passwordHash = await Argon2Util.hash('password123');
      mockFindByEmail.mockResolvedValue({
         id: '01923456-789a-7bc4-8901-234567890abc',
         email: 'login@example.com',
         passwordHash,
         status: USER_STATUS.ACTIVE,
         isEmailVerified: true,
         roles: [DEFAULT_ROLES.USER],
         createdAt: '2026-09-26T00:00:00.000Z',
      });

      await expect(
         service.login({
            email: 'login@example.com',
            password: 'wrongpassword',
            ip: '192.168.1.50',
         }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockAuditLogRecord).toHaveBeenCalledWith(
         expect.objectContaining({
            accountId: '01923456-789a-7bc4-8901-234567890abc',
            actorEmail: 'login@example.com',
            action: AUDIT_ACTIONS.AUTH_LOGIN_FAILED,
            status: AUDIT_STATUS.FAILURE,
         }),
      );
   });

   it('should refresh token successfully, record audit log and rotate refresh token', async () => {
      const nowInSeconds = Math.floor(Date.now() / 1000);
      mockValidateRefreshToken.mockResolvedValue({
         sub: 'user-123',
         email: 'user@example.com',
         roles: [DEFAULT_ROLES.USER],
         tokenType: JWT_TOKEN_TYPE.REFRESH,
         jti: 'old-jti-123',
         exp: nowInSeconds + 600,
      });

      mockFindById.mockResolvedValue({
         id: 'user-123',
         email: 'user@example.com',
         status: USER_STATUS.ACTIVE,
         roles: [DEFAULT_ROLES.USER],
         createdAt: '2026-09-26T00:00:00.000Z',
      });

      mockRotateTokenPair.mockResolvedValue({
         accessToken: 'new-access-token',
         refreshToken: 'new-refresh-token',
      });

      const res = await service.refreshToken('some-valid-refresh-token');

      expect(res.accessToken).toBe('new-access-token');
      expect(res.refreshToken).toBe('new-refresh-token');
      expect(mockAuditLogRecord).toHaveBeenCalledWith(
         expect.objectContaining({
            accountId: 'user-123',
            actorEmail: 'user@example.com',
            action: AUDIT_ACTIONS.AUTH_TOKEN_REFRESH,
            status: AUDIT_STATUS.SUCCESS,
         }),
      );
   });

   it('should delegate getSessions to TokenService', async () => {
      mockGetActiveSessions.mockResolvedValue([{ id: 'sess-1', isCurrent: true }]);

      const result = await service.getSessions('user-123', 'current-jti');

      expect(mockGetActiveSessions).toHaveBeenCalledWith('user-123', 'current-jti');
      expect(result).toHaveLength(1);
   });

   it('should delegate revokeSession to TokenService and record audit log', async () => {
      mockRevokeSession.mockResolvedValue(undefined);

      await service.revokeSession('user-123', 'sess-1');

      expect(mockRevokeSession).toHaveBeenCalledWith('user-123', 'sess-1');
      expect(mockAuditLogRecord).toHaveBeenCalledWith(
         expect.objectContaining({
            accountId: 'user-123',
            action: AUDIT_ACTIONS.AUTH_SESSION_REVOKE,
            status: AUDIT_STATUS.SUCCESS,
         }),
      );
   });

   it('should delegate revokeOtherSessions to TokenService and record audit log', async () => {
      mockRevokeOtherSessions.mockResolvedValue({
         revokedCount: 2,
      });

      const result = await service.revokeOtherSessions('user-123', 'current-jti');

      expect(mockRevokeOtherSessions).toHaveBeenCalledWith('user-123', 'current-jti');
      expect(mockAuditLogRecord).toHaveBeenCalledWith(
         expect.objectContaining({
            accountId: 'user-123',
            action: AUDIT_ACTIONS.AUTH_SESSION_REVOKE_OTHERS,
            status: AUDIT_STATUS.SUCCESS,
         }),
      );
      expect(result.revokedCount).toBe(2);
   });

   it('should revoke token by delegating to TokenService and record audit log', async () => {
      mockRevokeToken.mockResolvedValue(undefined);

      await service.revokeToken('token-to-revoke');

      expect(mockRevokeToken).toHaveBeenCalledWith('token-to-revoke');
      expect(mockAuditLogRecord).toHaveBeenCalledWith(
         expect.objectContaining({
            action: AUDIT_ACTIONS.AUTH_TOKEN_REVOKE,
            status: AUDIT_STATUS.SUCCESS,
         }),
      );
   });

   it('should revoke all account tokens by delegating to TokenService and record audit log', async () => {
      mockRevokeAllAccountTokens.mockResolvedValue(undefined);

      await service.revokeAllAccountTokens('account-123');

      expect(mockRevokeAllAccountTokens).toHaveBeenCalledWith('account-123');
      expect(mockAuditLogRecord).toHaveBeenCalledWith(
         expect.objectContaining({
            accountId: 'account-123',
            action: AUDIT_ACTIONS.AUTH_TOKEN_REVOKE,
            status: AUDIT_STATUS.SUCCESS,
         }),
      );
   });

   it('should logoutAll by delegating to TokenService.logoutAll and record audit log', async () => {
      mockLogoutAll.mockResolvedValue(undefined);

      await service.logoutAll('user-123');

      expect(mockLogoutAll).toHaveBeenCalledWith('user-123');
      expect(mockAuditLogRecord).toHaveBeenCalledWith(
         expect.objectContaining({
            accountId: 'user-123',
            action: AUDIT_ACTIONS.AUTH_LOGOUT_ALL,
            status: AUDIT_STATUS.SUCCESS,
         }),
      );
   });

   describe('changePassword', () => {
      it('should validate old password, hash new password, store in redis and emit OTP email', async () => {
         const passwordHash = await Argon2Util.hash('oldPassword123');
         mockFindById.mockResolvedValue({
            id: 'account-123',
            email: 'user@example.com',
            passwordHash,
            status: USER_STATUS.ACTIVE,
            roles: [DEFAULT_ROLES.USER],
            createdAt: '2026-09-26T00:00:00.000Z',
         });

         const result = await service.changePassword('account-123', {
            currentPassword: 'oldPassword123',
            newPassword: 'newPassword456!',
            confirmPassword: 'newPassword456!',
            logoutAll: true,
         });

         expect(result.success).toBe(true);
         expect(mockNotificationClient.emit).toHaveBeenCalledWith(
            NOTIFICATION_PATTERNS.SEND_CHANGE_PASSWORD_OTP_EMAIL,
            expect.objectContaining({
               to: 'user@example.com',
               expiresInMinutes: 10,
            }),
         );
         expect(redisStore.has(`${REDIS_KEY_PREFIX.OTP_CHANGE_PASSWORD}user@example.com`)).toBe(true);
         expect(mockAuditLogRecord).toHaveBeenCalledWith(
            expect.objectContaining({
               accountId: 'account-123',
               actorEmail: 'user@example.com',
               action: AUDIT_ACTIONS.AUTH_OTP_SENT,
               status: AUDIT_STATUS.SUCCESS,
            }),
         );
      });

      it('should throw BadRequestException when current password is wrong', async () => {
         const passwordHash = await Argon2Util.hash('correctPassword123');
         mockFindById.mockResolvedValue({
            id: 'account-123',
            email: 'user@example.com',
            passwordHash,
            status: USER_STATUS.ACTIVE,
         });

         await expect(
            service.changePassword('account-123', {
               currentPassword: 'wrongPassword123',
               newPassword: 'newPassword456!',
               confirmPassword: 'newPassword456!',
            }),
         ).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequestException if new password is same as old password', async () => {
         const passwordHash = await Argon2Util.hash('samePassword123');
         mockFindById.mockResolvedValue({
            id: 'account-123',
            email: 'user@example.com',
            passwordHash,
            status: USER_STATUS.ACTIVE,
         });

         await expect(
            service.changePassword('account-123', {
               currentPassword: 'samePassword123',
               newPassword: 'samePassword123',
               confirmPassword: 'samePassword123',
            }),
         ).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequestException if cooldown is active for change password OTP', async () => {
         const passwordHash = await Argon2Util.hash('validPassword123');
         mockFindById.mockResolvedValue({
            id: 'account-123',
            email: 'user@example.com',
            passwordHash,
            status: USER_STATUS.ACTIVE,
         });
         redisStore.set(`${REDIS_KEY_PREFIX.OTP_CHANGE_PASSWORD_COOLDOWN}user@example.com`, '1');

         await expect(
            service.changePassword('account-123', {
               currentPassword: 'validPassword123',
               newPassword: 'newPassword456!',
               confirmPassword: 'newPassword456!',
            }),
         ).rejects.toThrow(BadRequestException);
      });
   });

   describe('verifyChangePasswordOtp', () => {
      it('should change password successfully when OTP is valid and logoutAll was true', async () => {
         mockFindById.mockResolvedValue({
            id: 'account-123',
            email: 'user@example.com',
            status: USER_STATUS.ACTIVE,
         });
         mockUpdateAccount.mockResolvedValue({});
         redisStore.set(
            `${REDIS_KEY_PREFIX.OTP_CHANGE_PASSWORD}user@example.com`,
            JSON.stringify({
               otp: '654321',
               newPasswordHash: 'precomputedHash123',
               logoutAll: true,
            }),
         );

         const result = await service.verifyChangePasswordOtp('account-123', {
            otp: '654321',
         });

         expect(result.success).toBe(true);
         expect(mockUpdateAccount).toHaveBeenCalledWith('account-123', { passwordHash: 'precomputedHash123' });
         expect(mockLogoutAll).toHaveBeenCalledWith('account-123');
         expect(redisStore.has(`${REDIS_KEY_PREFIX.OTP_CHANGE_PASSWORD}user@example.com`)).toBe(false);
      });

      it('should throw BadRequestException if OTP is expired', async () => {
         mockFindById.mockResolvedValue({
            id: 'account-123',
            email: 'user@example.com',
            status: USER_STATUS.ACTIVE,
         });

         await expect(
            service.verifyChangePasswordOtp('account-123', {
               otp: '123456',
            }),
         ).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequestException if OTP is invalid', async () => {
         mockFindById.mockResolvedValue({
            id: 'account-123',
            email: 'user@example.com',
            status: USER_STATUS.ACTIVE,
         });
         redisStore.set(
            `${REDIS_KEY_PREFIX.OTP_CHANGE_PASSWORD}user@example.com`,
            JSON.stringify({
               otp: '654321',
               newPasswordHash: 'precomputedHash123',
               logoutAll: false,
            }),
         );

         await expect(
            service.verifyChangePasswordOtp('account-123', {
               otp: '000000',
            }),
         ).rejects.toThrow(BadRequestException);
      });
   });

   describe('getEmail', () => {
      it('should return email details when account exists', async () => {
         mockFindEmailById.mockResolvedValue({
            id: 'account-123',
            email: 'user@example.com',
            isEmailVerified: true,
         });

         const result = await service.getEmail('account-123');

         expect(mockFindEmailById).toHaveBeenCalledWith('account-123');
         expect(result).toEqual({
            id: 'account-123',
            email: 'user@example.com',
            isEmailVerified: true,
         });
      });

      it('should throw NotFoundException when account does not exist', async () => {
         mockFindEmailById.mockResolvedValue(null);

         await expect(service.getEmail('non-existent')).rejects.toThrow(NotFoundException);
      });
   });
});
