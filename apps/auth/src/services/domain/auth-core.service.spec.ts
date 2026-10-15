import { Test, TestingModule } from '@nestjs/testing';
import { AuthCoreService } from '@auth/services/domain/auth-core.service';
import { AuthLoginService } from '@auth/services/domain/auth-login.service';
import { AuthTokenService } from '@auth/services/domain/auth-token.service';
import { AuthRbacService } from '@auth/services/domain/auth-rbac.service';
import { AuthAccountService } from '@auth/services/domain/auth-account.service';
import { JWT_SERVICE } from '@auth/services/infrastructure';
import type { LoginDto } from '@contracts/auth';

describe('AuthCoreService (Facade)', () => {
   let service: AuthCoreService;

   const mockAuthLoginService = {
      login: jest.fn(),
   };

   const mockAuthTokenService = {
      refreshToken: jest.fn(),
      revokeToken: jest.fn(),
      revokeAllAccountTokens: jest.fn(),
      logoutAll: jest.fn(),
      validateToken: jest.fn(),
   };

   const mockAuthRbacService = {
      getRolePermissions: jest.fn(),
   };

   const mockAuthAccountService = {
      getEmail: jest.fn(),
   };

   const mockJwtService = {
      getJwks: jest.fn().mockReturnValue({ keys: [] }),
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            AuthCoreService,
            {
               provide: AuthLoginService,
               useValue: mockAuthLoginService,
            },
            {
               provide: AuthTokenService,
               useValue: mockAuthTokenService,
            },
            {
               provide: AuthRbacService,
               useValue: mockAuthRbacService,
            },
            {
               provide: AuthAccountService,
               useValue: mockAuthAccountService,
            },
            {
               provide: JWT_SERVICE,
               useValue: mockJwtService,
            },
         ],
      }).compile();

      service = module.get<AuthCoreService>(AuthCoreService);
   });

   it('should be defined', () => {
      expect(service).toBeDefined();
   });

   it('should delegate getJwks to jwtService', () => {
      const result = service.getJwks();
      expect(result).toEqual({ keys: [] });
      expect(mockJwtService.getJwks).toHaveBeenCalledTimes(1);
   });

   it('should delegate getRolePermissions to authRbacService', async () => {
      mockAuthRbacService.getRolePermissions.mockResolvedValueOnce(['auth:read']);
      const result = await service.getRolePermissions('ADMIN');

      expect(result).toEqual(['auth:read']);
      expect(mockAuthRbacService.getRolePermissions).toHaveBeenCalledWith('ADMIN');
   });

   it('should delegate login to authLoginService', async () => {
      const dto: LoginDto = { email: 'user@example.com', password: 'password123' };
      const deviceInfo = { ipAddress: '127.0.0.1' };
      mockAuthLoginService.login.mockResolvedValueOnce({
         user: { id: 'acc-1' },
         accessToken: 'at',
         refreshToken: 'rt',
      });

      const result = await service.login(dto, deviceInfo);

      expect(result.accessToken).toBe('at');
      expect(mockAuthLoginService.login).toHaveBeenCalledWith(dto, deviceInfo);
   });

   it('should delegate refreshToken to authTokenService', async () => {
      const deviceInfo = { ipAddress: '127.0.0.1' };
      mockAuthTokenService.refreshToken.mockResolvedValueOnce({
         user: { id: 'acc-1' },
         accessToken: 'at2',
         refreshToken: 'rt2',
      });

      const result = await service.refreshToken('rt', deviceInfo);

      expect(result.accessToken).toBe('at2');
      expect(mockAuthTokenService.refreshToken).toHaveBeenCalledWith('rt', deviceInfo);
   });

   it('should delegate revokeToken to authTokenService', async () => {
      const deviceInfo = { ipAddress: '127.0.0.1' };
      await service.revokeToken('token-1', deviceInfo);

      expect(mockAuthTokenService.revokeToken).toHaveBeenCalledWith('token-1', deviceInfo);
   });

   it('should delegate revokeAllAccountTokens to authTokenService', async () => {
      const deviceInfo = { ipAddress: '127.0.0.1' };
      await service.revokeAllAccountTokens('acc-1', deviceInfo);

      expect(mockAuthTokenService.revokeAllAccountTokens).toHaveBeenCalledWith('acc-1', deviceInfo);
   });

   it('should delegate logoutAll to authTokenService', async () => {
      const deviceInfo = { ipAddress: '127.0.0.1' };
      await service.logoutAll('acc-1', deviceInfo);

      expect(mockAuthTokenService.logoutAll).toHaveBeenCalledWith('acc-1', deviceInfo);
   });

   it('should delegate validateToken to authTokenService', async () => {
      mockAuthTokenService.validateToken.mockResolvedValueOnce({
         valid: true,
         user: { id: 'acc-1' },
      });

      const result = await service.validateToken('token-1');

      expect(result.valid).toBe(true);
      expect(mockAuthTokenService.validateToken).toHaveBeenCalledWith('token-1');
   });

   it('should delegate getEmail to authAccountService', async () => {
      mockAuthAccountService.getEmail.mockResolvedValueOnce({
         id: 'acc-1',
         email: 'test@example.com',
         isEmailVerified: true,
      });

      const result = await service.getEmail('acc-1');

      expect(result.email).toBe('test@example.com');
      expect(mockAuthAccountService.getEmail).toHaveBeenCalledWith('acc-1');
   });
});
