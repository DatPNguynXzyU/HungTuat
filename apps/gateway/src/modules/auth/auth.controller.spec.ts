import { Test, TestingModule } from '@nestjs/testing';
import type { Request, Response } from 'express';
import { AUTH_COOKIES, CommonConfigService, JwtPayload, UnauthorizedException } from '@common';
import { GatewayConfigService } from '@/config';
import { AuthController } from '@/modules/auth/auth.controller';
import { AuthService } from '@/modules/auth/auth.service';

describe('Gateway AuthController', () => {
   let controller: AuthController;

   const mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
      refreshToken: jest.fn(),
      revokeToken: jest.fn(),
      revokeAllUserTokens: jest.fn(),
      logoutAll: jest.fn(),
      changePassword: jest.fn(),
      validateToken: jest.fn(),
   };

   const mockConfigService = {
      jwtSecret: 'test-secret',
      cookieName: 'access_token',
      isProduction: false,
      accessTokenCookieOptions: {
         httpOnly: true,
         secure: false,
         sameSite: 'lax' as const,
         path: '/',
         maxAge: 900000,
      },
      refreshTokenCookieOptions: {
         httpOnly: true,
         secure: false,
         sameSite: 'lax' as const,
         path: '/',
         maxAge: 604800000,
      },
      clearCookieOptions: {
         httpOnly: true,
         secure: false,
         sameSite: 'lax' as const,
         path: '/',
      },
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         controllers: [AuthController],
         providers: [
            {
               provide: AuthService,
               useValue: mockAuthService,
            },
            {
               provide: GatewayConfigService,
               useValue: mockConfigService,
            },
            {
               provide: CommonConfigService,
               useValue: mockConfigService,
            },
         ],
      }).compile();

      controller = module.get<AuthController>(AuthController);
   });

   it('should be defined', () => {
      expect(controller).toBeDefined();
   });

   it('should register and set dual HTTP-only cookies (access_token & refresh_token)', async () => {
      const registerDto = {
         email: 'test@example.com',
         password: 'password123',
         fullName: 'Test User',
      };

      const mockCookie = jest.fn();
      const mockResponse = {
         cookie: mockCookie,
      } as unknown as Response;

      mockAuthService.register.mockResolvedValue({
         user: { id: 'usr_1', email: 'test@example.com', fullName: 'Test User' },
         accessToken: 'mock-access-token',
         refreshToken: 'mock-refresh-token',
      });

      const res = await controller.register(registerDto, mockResponse);

      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
      expect(mockCookie).toHaveBeenCalledWith(
         AUTH_COOKIES.ACCESS_TOKEN,
         'mock-access-token',
         mockConfigService.accessTokenCookieOptions,
      );
      expect(mockCookie).toHaveBeenCalledWith(
         AUTH_COOKIES.REFRESH_TOKEN,
         'mock-refresh-token',
         mockConfigService.refreshTokenCookieOptions,
      );
      expect(res.user).toEqual({
         id: 'usr_1',
         email: 'test@example.com',
         fullName: 'Test User',
      });
   });

   it('should login and set dual HTTP-only cookies', async () => {
      const loginDto = {
         email: 'test@example.com',
         password: 'password123',
      };

      const mockCookie = jest.fn();
      const mockResponse = {
         cookie: mockCookie,
      } as unknown as Response;

      mockAuthService.login.mockResolvedValue({
         user: { id: 'usr_1', email: 'test@example.com', fullName: 'Test User' },
         accessToken: 'mock-access-token',
         refreshToken: 'mock-refresh-token',
      });

      const res = await controller.login(loginDto, mockResponse);

      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
      expect(mockCookie).toHaveBeenCalledWith(
         AUTH_COOKIES.ACCESS_TOKEN,
         'mock-access-token',
         mockConfigService.accessTokenCookieOptions,
      );
      expect(mockCookie).toHaveBeenCalledWith(
         AUTH_COOKIES.REFRESH_TOKEN,
         'mock-refresh-token',
         mockConfigService.refreshTokenCookieOptions,
      );
      expect(res.user).toEqual({
         id: 'usr_1',
         email: 'test@example.com',
         fullName: 'Test User',
      });
   });

   it('should refresh token using cookie and set new cookies', async () => {
      const mockRequest = {
         cookies: {
            [AUTH_COOKIES.REFRESH_TOKEN]: 'valid-refresh-token',
         },
      } as unknown as Request;

      const mockCookie = jest.fn();
      const mockResponse = {
         cookie: mockCookie,
      } as unknown as Response;

      mockAuthService.refreshToken.mockResolvedValue({
         user: { id: 'usr_1', email: 'test@example.com', fullName: 'Test User' },
         accessToken: 'new-access-token',
         refreshToken: 'new-refresh-token',
      });

      const res = await controller.refreshToken(mockRequest, mockResponse);

      expect(mockAuthService.refreshToken).toHaveBeenCalledWith('valid-refresh-token');
      expect(mockCookie).toHaveBeenCalledWith(
         AUTH_COOKIES.ACCESS_TOKEN,
         'new-access-token',
         mockConfigService.accessTokenCookieOptions,
      );
      expect(mockCookie).toHaveBeenCalledWith(
         AUTH_COOKIES.REFRESH_TOKEN,
         'new-refresh-token',
         mockConfigService.refreshTokenCookieOptions,
      );
      expect(res.user).toBeDefined();
   });

   it('should throw UnauthorizedException if refresh token is missing', async () => {
      const mockRequest = {
         cookies: {},
      } as unknown as Request;

      const mockResponse = {
         cookie: jest.fn(),
      } as unknown as Response;

      await expect(controller.refreshToken(mockRequest, mockResponse)).rejects.toThrow(UnauthorizedException);
   });

   it('should revoke token and clear both cookies', async () => {
      const mockRequest = {
         cookies: {
            [AUTH_COOKIES.REFRESH_TOKEN]: 'token-to-revoke',
         },
      } as unknown as Request;

      const mockClearCookie = jest.fn();
      const mockResponse = {
         clearCookie: mockClearCookie,
      } as unknown as Response;

      mockAuthService.revokeToken.mockResolvedValue({ success: true, message: 'Token revoked' });

      const res = await controller.revokeToken(mockRequest, mockResponse);

      expect(mockAuthService.revokeToken).toHaveBeenCalledWith('token-to-revoke');
      expect(mockClearCookie).toHaveBeenCalledWith(AUTH_COOKIES.ACCESS_TOKEN, mockConfigService.clearCookieOptions);
      expect(mockClearCookie).toHaveBeenCalledWith(AUTH_COOKIES.REFRESH_TOKEN, mockConfigService.clearCookieOptions);
      expect(res.message).toBe('Token revoked and logged out successfully');
   });

   it('should logout and clear auth cookies', async () => {
      const mockRequest = {
         cookies: {
            [AUTH_COOKIES.REFRESH_TOKEN]: 'token-to-logout',
         },
      } as unknown as Request;

      const mockClearCookie = jest.fn();
      const mockResponse = {
         clearCookie: mockClearCookie,
      } as unknown as Response;

      mockAuthService.revokeToken.mockResolvedValue({ success: true, message: 'Token revoked' });

      const res = await controller.logout(mockRequest, mockResponse);

      expect(mockAuthService.revokeToken).toHaveBeenCalledWith('token-to-logout');
      expect(mockClearCookie).toHaveBeenCalledWith(AUTH_COOKIES.ACCESS_TOKEN, mockConfigService.clearCookieOptions);
      expect(mockClearCookie).toHaveBeenCalledWith(AUTH_COOKIES.REFRESH_TOKEN, mockConfigService.clearCookieOptions);
      expect(res.message).toBe('Logged out successfully');
   });

   it('should logoutAll, revoke all user tokens and clear auth cookies', async () => {
      const mockClearCookie = jest.fn();
      const mockResponse = {
         clearCookie: mockClearCookie,
      } as unknown as Response;

      const user: JwtPayload = {
         sub: 'user-123',
         email: 'user@example.com',
         tokenType: 'access',
      };

      mockAuthService.logoutAll.mockResolvedValue({ success: true, message: 'All sessions logged out' });

      const res = await controller.logoutAll(user, mockResponse);

      expect(mockAuthService.logoutAll).toHaveBeenCalledWith('user-123');
      expect(mockClearCookie).toHaveBeenCalledWith(AUTH_COOKIES.ACCESS_TOKEN, mockConfigService.clearCookieOptions);
      expect(mockClearCookie).toHaveBeenCalledWith(AUTH_COOKIES.REFRESH_TOKEN, mockConfigService.clearCookieOptions);
      expect(res.message).toBe('All sessions logged out successfully');
   });

   it('should changePassword, revoke all user sessions and clear auth cookies', async () => {
      const mockClearCookie = jest.fn();
      const mockResponse = {
         clearCookie: mockClearCookie,
      } as unknown as Response;

      const user: JwtPayload = {
         sub: 'user-123',
         email: 'user@example.com',
         tokenType: 'access',
      };

      const changePasswordDto = {
         currentPassword: 'oldPassword123',
         newPassword: 'newPassword123',
      };

      mockAuthService.changePassword.mockResolvedValue({
         success: true,
         message: 'Password changed successfully. All sessions have been logged out.',
      });

      const res = await controller.changePassword(user, changePasswordDto, mockResponse);

      expect(mockAuthService.changePassword).toHaveBeenCalledWith('user-123', changePasswordDto);
      expect(mockClearCookie).toHaveBeenCalledWith(AUTH_COOKIES.ACCESS_TOKEN, mockConfigService.clearCookieOptions);
      expect(mockClearCookie).toHaveBeenCalledWith(AUTH_COOKIES.REFRESH_TOKEN, mockConfigService.clearCookieOptions);
      expect(res.message).toBe('Password changed successfully. All sessions have been logged out.');
   });
});
