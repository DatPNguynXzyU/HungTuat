import { Test, TestingModule } from '@nestjs/testing';
import {
   Argon2Util,
   BadRequestException,
   DEFAULT_ROLES,
   NOTIFICATION_EVENTS,
   RbacCacheService,
   REDIS_KEY_PREFIX,
   REDIS_TTL,
   RedisService,
   USER_STATUS,
   UnauthorizedException,
} from '@common';
import { AuthService } from '@auth/auth.service';
import { AUTH_ERROR_CODES } from '@auth/constants/auth-error-codes';
import type { CreateUserData } from '@auth/entities/user.entity';
import { OutboxPublisherService } from '@auth/outbox/services/outbox-publisher.service';
import { AUTH_REPOSITORY } from '@auth/repositories';
import { TokenService } from '@auth/services/token.service';
import { AuthConfigService } from '@auth/config';

describe('AuthService', () => {
   let service: AuthService;
   const mockFindByEmail = jest.fn();
   const mockFindById = jest.fn();
   const mockCreateUser = jest.fn();
   const mockUpdateUser = jest.fn();
   const mockDeleteUser = jest.fn();
   const mockFindRoleByCode = jest.fn();
   const mockAssignRoleToUser = jest.fn();

   const mockGetRole = jest.fn();
   const mockSetRole = jest.fn();
   const mockGetRolePermissions = jest.fn();
   const mockSetRolePermissions = jest.fn();

   const mockGenerateTokenPair = jest.fn();
   const mockValidateAccessToken = jest.fn();
   const mockValidateRefreshToken = jest.fn();
   const mockRevokeToken = jest.fn();
   const mockRevokeAllUserTokens = jest.fn();
   const mockLogoutAll = jest.fn();
   const mockInvalidateRefreshToken = jest.fn();

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
      getJson: jest.fn().mockResolvedValue(null),
      setJson: jest.fn().mockResolvedValue(undefined),
   };

   const mockOutboxPublisherService = {
      triggerPublish: jest.fn(),
      publishPendingEvents: jest.fn().mockResolvedValue(0),
   };

   beforeEach(async () => {
      jest.clearAllMocks();
      redisStore.clear();

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            AuthService,
            {
               provide: AUTH_REPOSITORY,
               useValue: {
                  findByEmail: mockFindByEmail,
                  findById: mockFindById,
                  createUser: mockCreateUser,
                  updateUser: mockUpdateUser,
                  deleteUser: mockDeleteUser,
                  findRoleByCode: mockFindRoleByCode,
                  assignRoleToUser: mockAssignRoleToUser,
               },
            },
            {
               provide: OutboxPublisherService,
               useValue: mockOutboxPublisherService,
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
               provide: TokenService,
               useValue: {
                  generateTokenPair: mockGenerateTokenPair,
                  validateAccessToken: mockValidateAccessToken,
                  validateRefreshToken: mockValidateRefreshToken,
                  revokeToken: mockRevokeToken,
                  revokeAllUserTokens: mockRevokeAllUserTokens,
                  logoutAll: mockLogoutAll,
                  invalidateRefreshToken: mockInvalidateRefreshToken,
               },
            },
            {
               provide: RedisService,
               useValue: mockRedisService,
            },
            {
               provide: AuthConfigService,
               useValue: {
                  argon2Secret: undefined,
               },
            },
         ],
      }).compile();

      service = module.get<AuthService>(AuthService);
   });

   it('should be defined', () => {
      expect(service).toBeDefined();
   });

   it('should throw BadRequestException with AUTH.EMAIL_ALREADY_EXISTS if email already exists on register', async () => {
      mockFindByEmail.mockResolvedValue({
         id: 'existing-id',
         email: 'test@example.com',
         fullName: 'Existing',
         passwordHash: 'hash',
         createdAt: new Date().toISOString(),
      });

      await expect(
         service.register({
            email: 'test@example.com',
            password: 'password123',
            fullName: 'Test User',
         }),
      ).rejects.toThrow(BadRequestException);

      try {
         await service.register({
            email: 'test@example.com',
            password: 'password123',
            fullName: 'Test User',
         });
      } catch (err) {
         expect(err).toBeInstanceOf(BadRequestException);
         expect((err as BadRequestException).errorCode).toBe(AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS);
      }
   });

   it('should call repository.createUser with outbox event on register and trigger publisher', async () => {
      mockFindByEmail.mockResolvedValue(null);
      mockGetRole.mockResolvedValue({
         id: 'role-user-id',
         code: DEFAULT_ROLES.USER,
         name: 'Standard User',
         permissions: ['USERS:READ'],
      });

      mockCreateUser.mockImplementation((data: CreateUserData) =>
         Promise.resolve({
            id: '01923456-789a-7bc4-8901-234567890abc',
            email: data.email,
            fullName: data.fullName,
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
         fullName: 'New User',
      });

      expect(mockCreateUser).toHaveBeenCalledWith(
         expect.objectContaining({
            email: 'new@example.com',
            roleId: 'role-user-id',
            status: USER_STATUS.ACTIVE,
            isEmailVerified: false,
         }),
         expect.objectContaining({
            aggregateType: 'USER',
            eventType: NOTIFICATION_EVENTS.USER_REGISTERED,
            payload: {
               email: 'new@example.com',
               fullName: 'New User',
            },
         }),
      );
      expect(mockOutboxPublisherService.triggerPublish).toHaveBeenCalled();
      expect(res.user.id).toBe('01923456-789a-7bc4-8901-234567890abc');
      expect(res.user.roles).toEqual([DEFAULT_ROLES.USER]);
      expect(res.user.status).toBe(USER_STATUS.ACTIVE);
      expect(res.user.isEmailVerified).toBe(false);
      expect(res.accessToken).toBe('mock-access-token');
      expect(res.refreshToken).toBe('mock-refresh-token');
   });

   it('should login successfully when credentials match, reset failed attempts and update lastLoginAt', async () => {
      const passwordHash = await Argon2Util.hash('password123');
      mockFindByEmail.mockResolvedValue({
         id: '01923456-789a-7bc4-8901-234567890abc',
         email: 'login@example.com',
         fullName: 'Login User',
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
      expect(mockUpdateUser).toHaveBeenCalledTimes(1);
      const updateCall = mockUpdateUser.mock.calls[0] as [string, { lastLoginAt?: string }];
      expect(updateCall[0]).toBe('01923456-789a-7bc4-8901-234567890abc');
      expect(typeof updateCall[1].lastLoginAt).toBe('string');
      expect(res.user.email).toBe('login@example.com');
      expect(res.user.status).toBe(USER_STATUS.ACTIVE);
      expect(res.accessToken).toBe('mock-access-token');
      expect(res.refreshToken).toBe('mock-refresh-token');
   });

   describe('Failed Login Attempts & Account Lockout Mechanism', () => {
      it('should increment failed attempts counter on wrong password and throw INVALID_CREDENTIALS', async () => {
         const passwordHash = await Argon2Util.hash('correctPassword');
         mockFindByEmail.mockResolvedValue({
            id: 'user-1',
            email: 'user@example.com',
            passwordHash,
            status: USER_STATUS.ACTIVE,
            roles: [DEFAULT_ROLES.USER],
         });

         await expect(
            service.login({
               email: 'user@example.com',
               password: 'wrongPassword',
               ip: '10.0.0.1',
            }),
         ).rejects.toThrow(UnauthorizedException);

         expect(mockRedisService.incr).toHaveBeenCalledWith(
            `${REDIS_KEY_PREFIX.FAILED_LOGIN_ATTEMPTS}user@example.com:10.0.0.1`,
         );
         expect(mockRedisService.expire).toHaveBeenCalledWith(
            `${REDIS_KEY_PREFIX.FAILED_LOGIN_ATTEMPTS}user@example.com:10.0.0.1`,
            REDIS_TTL.AUTH_FAILED_ATTEMPTS,
         );
      });

      it('should increment failed attempts counter when email does not exist and throw INVALID_CREDENTIALS', async () => {
         mockFindByEmail.mockResolvedValue(null);

         await expect(
            service.login({
               email: 'nonexistent@example.com',
               password: 'anyPassword',
               ip: '10.0.0.1',
            }),
         ).rejects.toThrow(UnauthorizedException);

         expect(mockRedisService.incr).toHaveBeenCalledWith(
            `${REDIS_KEY_PREFIX.FAILED_LOGIN_ATTEMPTS}nonexistent@example.com:10.0.0.1`,
         );
      });

      it('should temporarily lock account for 15 minutes after 5 consecutive failed attempts', async () => {
         const passwordHash = await Argon2Util.hash('correctPassword');
         mockFindByEmail.mockResolvedValue({
            id: 'user-1',
            email: 'user@example.com',
            passwordHash,
            status: USER_STATUS.ACTIVE,
            roles: [DEFAULT_ROLES.USER],
         });

         const loginDto = {
            email: 'user@example.com',
            password: 'wrongPassword',
            ip: '198.51.100.22',
         };

         // 1st to 4th failed attempt: should throw INVALID_CREDENTIALS
         for (let i = 1; i <= 4; i++) {
            await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
         }

         // 5th failed attempt: reaches threshold -> locks account and throws ACCOUNT_LOCKED_TEMPORARILY
         try {
            await service.login(loginDto);
            fail('Expected 5th login attempt to throw ACCOUNT_LOCKED_TEMPORARILY');
         } catch (err) {
            expect(err).toBeInstanceOf(UnauthorizedException);
            const appErr = err as UnauthorizedException;
            expect(appErr.errorCode).toBe(AUTH_ERROR_CODES.ACCOUNT_LOCKED_TEMPORARILY);
         }

         // Verify lockout key is stored in Redis
         const lockoutKey = `${REDIS_KEY_PREFIX.LOCKOUT}user@example.com:198.51.100.22`;
         expect(mockRedisService.set).toHaveBeenCalledWith(lockoutKey, 'locked', REDIS_TTL.AUTH_LOCKOUT);
         expect(mockRedisService.del).toHaveBeenCalledWith(
            `${REDIS_KEY_PREFIX.FAILED_LOGIN_ATTEMPTS}user@example.com:198.51.100.22`,
         );
      });

      it('should reject login immediately if account+IP is already locked out without querying DB', async () => {
         const lockoutKey = `${REDIS_KEY_PREFIX.LOCKOUT}locked@example.com:10.0.0.5`;
         redisStore.set(lockoutKey, 'locked');

         try {
            await service.login({
               email: 'locked@example.com',
               password: 'anyPassword',
               ip: '10.0.0.5',
            });
            fail('Expected login to throw ACCOUNT_LOCKED_TEMPORARILY');
         } catch (err) {
            expect(err).toBeInstanceOf(UnauthorizedException);
            const appErr = err as UnauthorizedException;
            expect(appErr.errorCode).toBe(AUTH_ERROR_CODES.ACCOUNT_LOCKED_TEMPORARILY);
         }

         // FindByEmail must not be called when locked
         expect(mockFindByEmail).not.toHaveBeenCalled();
      });

      it('should isolate lockout by IP: locked IP cannot login, but different IP with correct password can login', async () => {
         const passwordHash = await Argon2Util.hash('correctPassword123');
         mockFindByEmail.mockResolvedValue({
            id: 'user-1',
            email: 'victim@example.com',
            passwordHash,
            status: USER_STATUS.ACTIVE,
            roles: [DEFAULT_ROLES.USER],
            createdAt: '2026-09-26T00:00:00.000Z',
         });
         mockGenerateTokenPair.mockResolvedValue({
            accessToken: 'valid-access',
            refreshToken: 'valid-refresh',
         });

         // Lock attacker IP
         const attackerLockoutKey = `${REDIS_KEY_PREFIX.LOCKOUT}victim@example.com:1.2.3.4`;
         redisStore.set(attackerLockoutKey, 'locked');

         // Attacker trying to login from 1.2.3.4 is blocked
         await expect(
            service.login({
               email: 'victim@example.com',
               password: 'correctPassword123',
               ip: '1.2.3.4',
            }),
         ).rejects.toThrow(UnauthorizedException);

         // Legitimate user trying to login from 5.6.7.8 succeeds
         const result = await service.login({
            email: 'victim@example.com',
            password: 'correctPassword123',
            ip: '5.6.7.8',
         });

         expect(result.accessToken).toBe('valid-access');
         expect(result.user.email).toBe('victim@example.com');
      });
   });

   it('should throw UnauthorizedException if account is BLOCKED or SUSPENDED on login', async () => {
      const passwordHash = await Argon2Util.hash('password123');
      mockFindByEmail.mockResolvedValue({
         id: 'blocked-user',
         email: 'blocked@example.com',
         passwordHash,
         status: USER_STATUS.BLOCKED,
         roles: [DEFAULT_ROLES.USER],
      });

      await expect(
         service.login({
            email: 'blocked@example.com',
            password: 'password123',
         }),
      ).rejects.toThrow(UnauthorizedException);
   });

   it('should throw UnauthorizedException if account is INACTIVE on login', async () => {
      const passwordHash = await Argon2Util.hash('password123');
      mockFindByEmail.mockResolvedValue({
         id: 'inactive-user',
         email: 'inactive@example.com',
         passwordHash,
         status: USER_STATUS.INACTIVE,
         roles: [DEFAULT_ROLES.USER],
      });

      await expect(
         service.login({
            email: 'inactive@example.com',
            password: 'password123',
         }),
      ).rejects.toThrow(UnauthorizedException);
   });

   it('should refresh token successfully and rotate refresh token', async () => {
      mockValidateRefreshToken.mockResolvedValue({
         sub: 'user-123',
         email: 'user@example.com',
         roles: [DEFAULT_ROLES.USER],
         tokenType: 'refresh',
         jti: 'old-jti-123',
      });

      mockFindById.mockResolvedValue({
         id: 'user-123',
         email: 'user@example.com',
         fullName: 'User Name',
         status: USER_STATUS.ACTIVE,
         roles: [DEFAULT_ROLES.USER],
         createdAt: '2026-09-26T00:00:00.000Z',
      });

      mockGenerateTokenPair.mockResolvedValue({
         accessToken: 'new-access-token',
         refreshToken: 'new-refresh-token',
      });

      const res = await service.refreshToken('some-valid-refresh-token');

      expect(res.accessToken).toBe('new-access-token');
      expect(res.refreshToken).toBe('new-refresh-token');
      expect(mockInvalidateRefreshToken).toHaveBeenCalledWith('user-123', 'old-jti-123', undefined);
      expect(mockGenerateTokenPair).toHaveBeenCalled();
   });

   it('should revoke token by delegating to TokenService', async () => {
      mockRevokeToken.mockResolvedValue({ success: true, message: 'Token revoked' });

      const res = await service.revokeToken('token-to-revoke');

      expect(mockRevokeToken).toHaveBeenCalledWith('token-to-revoke');
      expect(res.success).toBe(true);
   });

   it('should revoke all user tokens by delegating to TokenService', async () => {
      mockRevokeAllUserTokens.mockResolvedValue(undefined);

      await service.revokeAllUserTokens('user-123');

      expect(mockRevokeAllUserTokens).toHaveBeenCalledWith('user-123');
   });

   it('should logoutAll by delegating to TokenService.logoutAll', async () => {
      mockLogoutAll.mockResolvedValue(undefined);

      await service.logoutAll('user-123');

      expect(mockLogoutAll).toHaveBeenCalledWith('user-123');
   });

   describe('changePassword', () => {
      it('should throw UnauthorizedException if user not found', async () => {
         mockFindById.mockResolvedValue(null);

         await expect(
            service.changePassword('non-existent', {
               currentPassword: 'password123',
               newPassword: 'newpassword123',
            }),
         ).rejects.toThrow(UnauthorizedException);
      });

      it('should throw BadRequestException if currentPassword does not match', async () => {
         const passwordHash = await Argon2Util.hash('actualPassword');
         mockFindById.mockResolvedValue({
            id: 'user-123',
            passwordHash,
         });

         await expect(
            service.changePassword('user-123', {
               currentPassword: 'wrongPassword',
               newPassword: 'newpassword123',
            }),
         ).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequestException if newPassword is the same as currentPassword', async () => {
         const passwordHash = await Argon2Util.hash('samePassword');
         mockFindById.mockResolvedValue({
            id: 'user-123',
            passwordHash,
         });

         await expect(
            service.changePassword('user-123', {
               currentPassword: 'samePassword',
               newPassword: 'samePassword',
            }),
         ).rejects.toThrow(BadRequestException);
      });

      it('should update password and invalidate all sessions on success', async () => {
         const passwordHash = await Argon2Util.hash('oldPassword123');
         mockFindById.mockResolvedValue({
            id: 'user-123',
            passwordHash,
         });
         mockUpdateUser.mockResolvedValue({});
         mockLogoutAll.mockResolvedValue(undefined);

         const result = await service.changePassword('user-123', {
            currentPassword: 'oldPassword123',
            newPassword: 'newPassword123',
         });

         expect(result.success).toBe(true);
         expect(mockUpdateUser).toHaveBeenCalledTimes(1);
         const updateArgs = mockUpdateUser.mock.calls[0] as [string, { passwordHash?: string }];
         expect(updateArgs[0]).toBe('user-123');
         expect(typeof updateArgs[1].passwordHash).toBe('string');
         expect(mockLogoutAll).toHaveBeenCalledWith('user-123');
      });
   });

   it('should getRolePermissions by checking cache and fallback to repository', async () => {
      mockGetRole.mockResolvedValue(null);
      mockFindRoleByCode.mockResolvedValue({
         id: 'role-1',
         code: 'USER',
         name: 'User',
         permissions: ['USERS:READ'],
      });

      const perms = await service.getRolePermissions('USER');
      expect(mockFindRoleByCode).toHaveBeenCalledWith('USER');
      expect(mockSetRole).toHaveBeenCalled();
      expect(perms).toEqual(['USERS:READ']);
   });
});
