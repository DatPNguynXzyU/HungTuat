import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import {
   Argon2Util,
   BadRequestException,
   DEFAULT_ROLES,
   NOTIFICATION_EVENTS,
   RbacCacheService,
   SERVICES,
   USER_STATUS,
   UnauthorizedException,
} from '@common';
import { AuthService } from '@auth/auth.service';
import { AUTH_ERROR_CODES } from '@auth/constants/auth-error-codes';
import type { CreateUserData } from '@auth/entities/user.entity';
import { AUTH_REPOSITORY } from '@auth/repositories';
import { TokenService } from '@auth/services/token.service';

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

   const mockNotificationClient = {
      emit: jest.fn().mockReturnValue(of(true)),
      send: jest.fn().mockReturnValue(of(true)),
   };

   beforeEach(async () => {
      jest.clearAllMocks();
      mockNotificationClient.emit.mockReturnValue(of(true));

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
               provide: SERVICES.NOTIFICATION_SERVICE,
               useValue: mockNotificationClient,
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

   it('should call repository.createUser with cached USER role on register and return user with token pair and emit event', async () => {
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
      );
      expect(mockNotificationClient.emit).toHaveBeenCalledWith(NOTIFICATION_EVENTS.USER_REGISTERED, {
         email: 'new@example.com',
         fullName: 'New User',
      });
      expect(res.user.id).toBe('01923456-789a-7bc4-8901-234567890abc');
      expect(res.user.roles).toEqual([DEFAULT_ROLES.USER]);
      expect(res.user.status).toBe(USER_STATUS.ACTIVE);
      expect(res.user.isEmailVerified).toBe(false);
      expect(res.accessToken).toBe('mock-access-token');
      expect(res.refreshToken).toBe('mock-refresh-token');
   });

   it('should login successfully when credentials match, update lastLoginAt, and return duo tokens', async () => {
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
      });

      expect(mockFindByEmail).toHaveBeenCalledWith('login@example.com');
      expect(mockUpdateUser).toHaveBeenCalledTimes(1);
      const updateCall = mockUpdateUser.mock.calls[0] as [string, { lastLoginAt?: string }];
      expect(updateCall[0]).toBe('01923456-789a-7bc4-8901-234567890abc');
      expect(typeof updateCall[1].lastLoginAt).toBe('string');
      expect(res.user.email).toBe('login@example.com');
      expect(res.user.status).toBe(USER_STATUS.ACTIVE);
      expect(res.accessToken).toBe('mock-access-token');
      expect(res.refreshToken).toBe('mock-refresh-token');
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
