import { Test, TestingModule } from '@nestjs/testing';
import { Argon2Util, BadRequestException, DEFAULT_ROLES, RbacCacheService } from '@common';
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
   const mockInvalidateRefreshToken = jest.fn();

   beforeEach(async () => {
      jest.clearAllMocks();

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

   it('should call repository.createUser with cached USER role on register and return user with token pair', async () => {
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
         }),
      );
      expect(res.user.id).toBe('01923456-789a-7bc4-8901-234567890abc');
      expect(res.user.roles).toEqual([DEFAULT_ROLES.USER]);
      expect(res.accessToken).toBe('mock-access-token');
      expect(res.refreshToken).toBe('mock-refresh-token');
   });

   it('should login successfully when credentials match and return duo tokens', async () => {
      const passwordHash = await Argon2Util.hash('password123');
      mockFindByEmail.mockResolvedValue({
         id: '01923456-789a-7bc4-8901-234567890abc',
         email: 'login@example.com',
         fullName: 'Login User',
         passwordHash,
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
      expect(res.user.email).toBe('login@example.com');
      expect(res.accessToken).toBe('mock-access-token');
      expect(res.refreshToken).toBe('mock-refresh-token');
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
