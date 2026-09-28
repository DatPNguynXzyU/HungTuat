import { Test, TestingModule } from '@nestjs/testing';
import type { Request, Response } from 'express';
import {
   AUTH_COOKIES,
   CommonConfigService,
   DEFAULT_DEV_RSA_PRIVATE_KEY,
   DEFAULT_DEV_RSA_PUBLIC_KEY,
   DEFAULT_JWT_KEY_ID,
   JwtPayload,
   JwtUtil,
   UnauthorizedException,
} from '@common';
import { GatewayConfigService } from '@/config';
import { AuthController } from '@/modules/auth/auth.controller';
import { AuthService } from '@/modules/auth/auth.service';

describe('Gateway AuthController', () => {
   let controller: AuthController;

   const mockAuthService = {
      getJwks: jest.fn(),
      register: jest.fn(),
      login: jest.fn(),
      refreshToken: jest.fn(),
      revokeToken: jest.fn(),
      revokeAllUserTokens: jest.fn(),
      logoutAll: jest.fn(),
      changePassword: jest.fn(),
      validateToken: jest.fn(),
      getSessions: jest.fn(),
      revokeSession: jest.fn(),
      revokeOtherSessions: jest.fn(),
      getUserAuditLogs: jest.fn(),
   };

   const mockConfigService = {
      jwtPublicKey: DEFAULT_DEV_RSA_PUBLIC_KEY,
      jwtKeyId: DEFAULT_JWT_KEY_ID,
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

   describe('JWKS endpoints', () => {
      it('should return JWKS from auth microservice when available', async () => {
         const expectedJwks = {
            keys: [
               {
                  kty: 'RSA',
                  use: 'sig',
                  alg: 'RS256',
                  kid: 'test-kid',
                  n: 'test-n',
                  e: 'AQAB',
               },
            ],
         };
         mockAuthService.getJwks.mockResolvedValue(expectedJwks);

         const result = await controller.getJwks();
         expect(mockAuthService.getJwks).toHaveBeenCalled();
         expect(result).toEqual(expectedJwks);
      });

      it('should fallback to local public key JWKS if auth microservice fails', async () => {
         mockAuthService.getJwks.mockRejectedValue(new Error('Microservice unavailable'));

         const result = await controller.getJwks();
         expect(result).toBeDefined();
         expect(Array.isArray(result.keys)).toBe(true);
         expect(result.keys[0].kty).toBe('RSA');
         expect(result.keys[0].alg).toBe('RS256');
         expect(result.keys[0].kid).toBe(DEFAULT_JWT_KEY_ID);
      });

      it('should return JWKS for alias endpoint', async () => {
         const expectedJwks = {
            keys: [
               {
                  kty: 'RSA',
                  use: 'sig',
                  alg: 'RS256',
                  kid: 'alias-kid',
                  n: 'alias-n',
                  e: 'AQAB',
               },
            ],
         };
         mockAuthService.getJwks.mockResolvedValue(expectedJwks);

         const result = await controller.getJwksAlias();
         expect(result).toEqual(expectedJwks);
      });
   });

   it('should register and set dual HTTP-only cookies (access_token & refresh_token)', async () => {
      const registerDto = {
         email: 'test@example.com',
         password: 'password123',
         fullName: 'Test User',
      };

      const mockRequest = {
         headers: {
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
         },
      } as unknown as Request;

      const mockCookie = jest.fn();
      const mockResponse = {
         cookie: mockCookie,
      } as unknown as Response;

      mockAuthService.register.mockResolvedValue({
         user: { id: 'usr_1', email: 'test@example.com', fullName: 'Test User' },
         accessToken: 'mock-access-token',
         refreshToken: 'mock-refresh-token',
      });

      const res = await controller.register(mockRequest, registerDto, mockResponse);

      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto, expect.any(Object));
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

   it('should login and set dual HTTP-only cookies with forwarded IP', async () => {
      const loginDto = {
         email: 'test@example.com',
         password: 'password123',
      };

      const mockRequest = {
         headers: {
            'x-forwarded-for': '203.0.113.195, 70.41.3.18',
            'user-agent': 'Mozilla/5.0',
         },
      } as unknown as Request;

      const mockCookie = jest.fn();
      const mockResponse = {
         cookie: mockCookie,
      } as unknown as Response;

      mockAuthService.login.mockResolvedValue({
         user: { id: 'usr_1', email: 'test@example.com', fullName: 'Test User' },
         accessToken: 'mock-access-token',
         refreshToken: 'mock-refresh-token',
      });

      const res = await controller.login(mockRequest, loginDto, mockResponse);

      expect(mockAuthService.login).toHaveBeenCalledWith(
         expect.objectContaining({
            ...loginDto,
            ip: '203.0.113.195',
         }),
         expect.any(Object),
      );
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

      expect(mockAuthService.refreshToken).toHaveBeenCalledWith('valid-refresh-token', expect.any(Object));
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

   describe('Sessions endpoints', () => {
      it('should get active sessions list', async () => {
         const mockUser: JwtPayload = { sub: 'user-123', email: 'test@example.com', tokenType: 'access' };
         const validRefreshToken = JwtUtil.sign(
            { sub: 'user-123', tokenType: 'refresh', jti: 'current-jti' },
            DEFAULT_DEV_RSA_PRIVATE_KEY,
            604800,
         );
         const mockRequest = {
            cookies: {
               [AUTH_COOKIES.REFRESH_TOKEN]: validRefreshToken,
            },
         } as unknown as Request;

         mockAuthService.getSessions.mockResolvedValue([
            { id: 'sess-1', deviceName: 'Chrome on macOS', isCurrent: true },
         ]);

         const result = await controller.getSessions(mockUser, mockRequest);

         expect(mockAuthService.getSessions).toHaveBeenCalledWith('user-123', 'current-jti');
         expect(result).toHaveLength(1);
      });

      it('should revoke a session by session ID', async () => {
         const mockUser: JwtPayload = { sub: 'user-123', email: 'test@example.com', tokenType: 'access' };
         const mockRequest = { headers: {} } as unknown as Request;
         mockAuthService.revokeSession.mockResolvedValue({ success: true, message: 'Session revoked successfully' });

         const result = await controller.revokeSession(mockUser, 'sess-1', mockRequest);

         expect(mockAuthService.revokeSession).toHaveBeenCalledWith('user-123', 'sess-1', expect.any(Object));
         expect(result.message).toBe('Session revoked successfully');
      });

      it('should revoke other sessions', async () => {
         const mockUser: JwtPayload = { sub: 'user-123', email: 'test@example.com', tokenType: 'access' };
         const validRefreshToken = JwtUtil.sign(
            { sub: 'user-123', tokenType: 'refresh', jti: 'current-jti' },
            DEFAULT_DEV_RSA_PRIVATE_KEY,
            604800,
         );
         const mockRequest = {
            cookies: {
               [AUTH_COOKIES.REFRESH_TOKEN]: validRefreshToken,
            },
            headers: {},
         } as unknown as Request;

         mockAuthService.revokeOtherSessions.mockResolvedValue({
            success: true,
            message: 'All other sessions revoked successfully',
            revokedCount: 2,
         });

         const result = await controller.revokeOtherSessions(mockUser, mockRequest);

         expect(mockAuthService.revokeOtherSessions).toHaveBeenCalledWith(
            'user-123',
            'current-jti',
            expect.any(Object),
         );
         expect(result.message).toBe('All other sessions revoked successfully');
         expect(result.revokedCount).toBe(2);
      });
   });

   it('should revoke token and clear both cookies', async () => {
      const mockRequest = {
         cookies: {
            [AUTH_COOKIES.REFRESH_TOKEN]: 'token-to-revoke',
         },
         headers: {},
      } as unknown as Request;

      const mockClearCookie = jest.fn();
      const mockResponse = {
         clearCookie: mockClearCookie,
      } as unknown as Response;

      mockAuthService.revokeToken.mockResolvedValue({ success: true, message: 'Token revoked' });

      const res = await controller.revokeToken(mockRequest, mockResponse);

      expect(mockAuthService.revokeToken).toHaveBeenCalledWith('token-to-revoke', expect.any(Object));
      expect(mockClearCookie).toHaveBeenCalledWith(AUTH_COOKIES.ACCESS_TOKEN, mockConfigService.clearCookieOptions);
      expect(mockClearCookie).toHaveBeenCalledWith(AUTH_COOKIES.REFRESH_TOKEN, mockConfigService.clearCookieOptions);
      expect(res.message).toBe('Token revoked and logged out successfully');
   });

   it('should logout and clear auth cookies', async () => {
      const mockRequest = {
         cookies: {
            [AUTH_COOKIES.REFRESH_TOKEN]: 'token-to-logout',
         },
         headers: {},
      } as unknown as Request;

      const mockClearCookie = jest.fn();
      const mockResponse = {
         clearCookie: mockClearCookie,
      } as unknown as Response;

      mockAuthService.revokeToken.mockResolvedValue({ success: true, message: 'Token revoked' });

      const res = await controller.logout(mockRequest, mockResponse);

      expect(mockAuthService.revokeToken).toHaveBeenCalledWith('token-to-logout', expect.any(Object));
      expect(mockClearCookie).toHaveBeenCalledWith(AUTH_COOKIES.ACCESS_TOKEN, mockConfigService.clearCookieOptions);
      expect(mockClearCookie).toHaveBeenCalledWith(AUTH_COOKIES.REFRESH_TOKEN, mockConfigService.clearCookieOptions);
      expect(res.message).toBe('Logged out successfully');
   });

   it('should logoutAll, revoke all user tokens and clear auth cookies', async () => {
      const mockClearCookie = jest.fn();
      const mockResponse = {
         clearCookie: mockClearCookie,
      } as unknown as Response;

      const mockRequest = { headers: {} } as unknown as Request;

      const user: JwtPayload = {
         sub: 'user-123',
         email: 'user@example.com',
         tokenType: 'access',
      };

      mockAuthService.logoutAll.mockResolvedValue({ success: true, message: 'All sessions logged out' });

      const res = await controller.logoutAll(user, mockRequest, mockResponse);

      expect(mockAuthService.logoutAll).toHaveBeenCalledWith('user-123', expect.any(Object));
      expect(mockClearCookie).toHaveBeenCalledWith(AUTH_COOKIES.ACCESS_TOKEN, mockConfigService.clearCookieOptions);
      expect(mockClearCookie).toHaveBeenCalledWith(AUTH_COOKIES.REFRESH_TOKEN, mockConfigService.clearCookieOptions);
      expect(res.message).toBe('All sessions logged out successfully');
   });

   it('should changePassword, revoke all user sessions and clear auth cookies', async () => {
      const mockClearCookie = jest.fn();
      const mockResponse = {
         clearCookie: mockClearCookie,
      } as unknown as Response;

      const mockRequest = { headers: {} } as unknown as Request;

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

      const res = await controller.changePassword(user, changePasswordDto, mockRequest, mockResponse);

      expect(mockAuthService.changePassword).toHaveBeenCalledWith('user-123', changePasswordDto, expect.any(Object));
      expect(mockClearCookie).toHaveBeenCalledWith(AUTH_COOKIES.ACCESS_TOKEN, mockConfigService.clearCookieOptions);
      expect(mockClearCookie).toHaveBeenCalledWith(AUTH_COOKIES.REFRESH_TOKEN, mockConfigService.clearCookieOptions);
      expect(res.message).toBe('Password changed successfully. All sessions have been logged out.');
   });

   it('should get security logs for authenticated user', async () => {
      const user: JwtPayload = {
         sub: 'user-123',
         email: 'user@example.com',
         tokenType: 'access',
      };

      const mockResult = {
         data: [{ id: 'audit-1', action: 'AUTH.LOGIN_SUCCESS' }],
         total: 1,
         page: 1,
         limit: 10,
         totalPages: 1,
      };

      mockAuthService.getUserAuditLogs.mockResolvedValue(mockResult);

      const res = await controller.getSecurityLogs(user, { page: 1, limit: 10 });
      expect(mockAuthService.getUserAuditLogs).toHaveBeenCalledWith('user-123', 1, 10);
      expect(res).toEqual(mockResult);
   });
});
