import { Test, TestingModule } from '@nestjs/testing';
import type { Request, Response } from 'express';
import {
   AUTH_COOKIES,
   BadRequestException,
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
      checkEmail: jest.fn(),
      sendRegisterOtp: jest.fn(),
      verifyRegisterOtp: jest.fn(),
      register: jest.fn(),
      login: jest.fn(),
      refreshToken: jest.fn(),
      revokeToken: jest.fn(),
      revokeAllUserTokens: jest.fn(),
      logoutAll: jest.fn(),
      changePassword: jest.fn(),
      verifyChangePasswordOtp: jest.fn(),
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
      jwtAccessTokenExpiresIn: 900,
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

   describe('checkEmail endpoint', () => {
      it('should return availability status for valid email', async () => {
         mockAuthService.checkEmail.mockResolvedValue({ available: true, email: 'user@example.com' });

         const res = await controller.checkEmail('user@example.com');

         expect(mockAuthService.checkEmail).toHaveBeenCalledWith('user@example.com');
         expect(res).toEqual({ available: true, email: 'user@example.com' });
      });

      it('should throw BadRequestException if email is empty', async () => {
         await expect(controller.checkEmail('')).rejects.toThrow(BadRequestException);
      });
   });

   describe('OTP endpoints', () => {
      it('should send register OTP', async () => {
         const mockRequest = { headers: {} } as unknown as Request;
         mockAuthService.sendRegisterOtp.mockResolvedValue({
            success: true,
            message: 'OTP verification code has been sent to your email',
            cooldownSeconds: 60,
            expiresInMinutes: 5,
         });

         const res = await controller.sendRegisterOtp(mockRequest, { email: 'user@example.com' });

         expect(mockAuthService.sendRegisterOtp).toHaveBeenCalledWith(
            { email: 'user@example.com' },
            expect.any(Object),
         );
         expect(res.success).toBe(true);
         expect(res.cooldownSeconds).toBe(60);
      });

      it('should verify register OTP and return verificationToken', async () => {
         const mockRequest = { headers: {} } as unknown as Request;
         mockAuthService.verifyRegisterOtp.mockResolvedValue({
            success: true,
            verificationToken: 'vtok_1234567890',
            expiresInSeconds: 900,
         });

         const res = await controller.verifyRegisterOtp(mockRequest, {
            email: 'user@example.com',
            otp: '123456',
         });

         expect(mockAuthService.verifyRegisterOtp).toHaveBeenCalledWith(
            { email: 'user@example.com', otp: '123456' },
            expect.any(Object),
         );
         expect(res.success).toBe(true);
         expect(res.verificationToken).toBe('vtok_1234567890');
      });
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

   describe('Dual-mode authentication (cookies + response body tokens)', () => {
      it('should register and return tokens in both cookies and response body', async () => {
         const registerDto = {
            email: 'test@example.com',
            password: 'password123',
            confirmPassword: 'password123',
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
            user: { id: 'usr_1', email: 'test@example.com' },
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
         });

         const res = await controller.register(mockRequest, registerDto, mockResponse);

         expect(mockAuthService.register).toHaveBeenCalledWith(registerDto, expect.any(Object));

         // Verify cookies are set
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

         // Verify response body contains user and tokens
         expect(res.user).toEqual({
            id: 'usr_1',
            email: 'test@example.com',
         });
         expect(res.tokens).toBeDefined();
         expect(res.tokens.accessToken).toBe('mock-access-token');
         expect(res.tokens.refreshToken).toBe('mock-refresh-token');
         expect(res.tokens.tokenType).toBe('Bearer');
         expect(res.tokens.expiresIn).toBe(900);
      });

      it('should login and return tokens in both cookies and response body', async () => {
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
            user: { id: 'usr_1', email: 'test@example.com' },
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

         // Verify cookies
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

         // Verify response body
         expect(res.user).toEqual({
            id: 'usr_1',
            email: 'test@example.com',
         });
         expect(res.tokens).toBeDefined();
         expect(res.tokens.accessToken).toBe('mock-access-token');
         expect(res.tokens.refreshToken).toBe('mock-refresh-token');
         expect(res.tokens.tokenType).toBe('Bearer');
         expect(res.tokens.expiresIn).toBe(900);
      });

      it('should refresh token from cookie and return new tokens in both cookies and response body', async () => {
         const mockRequest = {
            cookies: {
               [AUTH_COOKIES.REFRESH_TOKEN]: 'valid-refresh-token',
            },
            headers: {},
         } as unknown as Request;

         const mockCookie = jest.fn();
         const mockResponse = {
            cookie: mockCookie,
         } as unknown as Response;

         mockAuthService.refreshToken.mockResolvedValue({
            user: { id: 'usr_1', email: 'test@example.com' },
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
         });

         const res = await controller.refreshToken(mockRequest, mockResponse, {});

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

         // Verify response body
         expect(res.user).toBeDefined();
         expect(res.tokens).toBeDefined();
         expect(res.tokens.accessToken).toBe('new-access-token');
         expect(res.tokens.refreshToken).toBe('new-refresh-token');
         expect(res.tokens.tokenType).toBe('Bearer');
         expect(res.tokens.expiresIn).toBe(900);
      });

      it('should refresh token from X-Refresh-Token header', async () => {
         const mockRequest = {
            cookies: {},
            headers: {
               'x-refresh-token': 'header-refresh-token',
            },
         } as unknown as Request;

         const mockCookie = jest.fn();
         const mockResponse = {
            cookie: mockCookie,
         } as unknown as Response;

         mockAuthService.refreshToken.mockResolvedValue({
            user: { id: 'usr_1', email: 'test@example.com' },
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
         });

         const res = await controller.refreshToken(mockRequest, mockResponse, {}, 'header-refresh-token');

         expect(mockAuthService.refreshToken).toHaveBeenCalledWith('header-refresh-token', expect.any(Object));
         expect(res.tokens).toBeDefined();
         expect(res.tokens.accessToken).toBe('new-access-token');
      });

      it('should refresh token from request body', async () => {
         const mockRequest = {
            cookies: {},
            headers: {},
         } as unknown as Request;

         const mockCookie = jest.fn();
         const mockResponse = {
            cookie: mockCookie,
         } as unknown as Response;

         mockAuthService.refreshToken.mockResolvedValue({
            user: { id: 'usr_1', email: 'test@example.com' },
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
         });

         const res = await controller.refreshToken(mockRequest, mockResponse, { refreshToken: 'body-refresh-token' });

         expect(mockAuthService.refreshToken).toHaveBeenCalledWith('body-refresh-token', expect.any(Object));
         expect(res.tokens).toBeDefined();
      });

      it('should throw UnauthorizedException if refresh token is missing from all sources', async () => {
         const mockRequest = {
            cookies: {},
            headers: {},
         } as unknown as Request;

         const mockResponse = {
            cookie: jest.fn(),
         } as unknown as Response;

         await expect(controller.refreshToken(mockRequest, mockResponse, {})).rejects.toThrow(UnauthorizedException);
      });
   });

   describe('Token revocation with multiple sources', () => {
      it('should revoke token from cookie', async () => {
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

         mockAuthService.revokeToken.mockResolvedValue(undefined);

         await controller.revokeToken(mockRequest, mockResponse, {});

         expect(mockAuthService.revokeToken).toHaveBeenCalledWith('token-to-revoke', expect.any(Object));
         expect(mockClearCookie).toHaveBeenCalledWith(AUTH_COOKIES.ACCESS_TOKEN, mockConfigService.clearCookieOptions);
         expect(mockClearCookie).toHaveBeenCalledWith(AUTH_COOKIES.REFRESH_TOKEN, mockConfigService.clearCookieOptions);
      });

      it('should revoke token from Authorization Bearer header', async () => {
         const mockRequest = {
            cookies: {},
            headers: {
               authorization: 'Bearer header-token-to-revoke',
            },
         } as unknown as Request;

         const mockClearCookie = jest.fn();
         const mockResponse = {
            clearCookie: mockClearCookie,
         } as unknown as Response;

         mockAuthService.revokeToken.mockResolvedValue(undefined);

         await controller.revokeToken(mockRequest, mockResponse, {}, 'Bearer header-token-to-revoke');

         expect(mockAuthService.revokeToken).toHaveBeenCalledWith('header-token-to-revoke', expect.any(Object));
      });

      it('should revoke token from request body', async () => {
         const mockRequest = {
            cookies: {},
            headers: {},
         } as unknown as Request;

         const mockClearCookie = jest.fn();
         const mockResponse = {
            clearCookie: mockClearCookie,
         } as unknown as Response;

         mockAuthService.revokeToken.mockResolvedValue(undefined);

         await controller.revokeToken(mockRequest, mockResponse, { token: 'body-token-to-revoke' });

         expect(mockAuthService.revokeToken).toHaveBeenCalledWith('body-token-to-revoke', expect.any(Object));
      });

      it('should logout from Authorization Bearer header', async () => {
         const mockRequest = {
            cookies: {},
            headers: {
               authorization: 'Bearer token-to-logout',
            },
         } as unknown as Request;

         const mockClearCookie = jest.fn();
         const mockResponse = {
            clearCookie: mockClearCookie,
         } as unknown as Response;

         mockAuthService.revokeToken.mockResolvedValue(undefined);

         await controller.logout(mockRequest, mockResponse, 'Bearer token-to-logout');

         expect(mockAuthService.revokeToken).toHaveBeenCalledWith('token-to-logout', expect.any(Object));
         expect(mockClearCookie).toHaveBeenCalledTimes(2);
      });
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
            headers: {},
         } as unknown as Request;

         mockAuthService.getSessions.mockResolvedValue([
            { id: 'sess-1', deviceName: 'Chrome on macOS', isCurrent: true },
         ]);

         const result = await controller.getSessions(mockUser, mockRequest);

         expect(mockAuthService.getSessions).toHaveBeenCalledWith('user-123', 'current-jti');
         expect(result).toHaveLength(1);
      });

      it('should extract JTI from Authorization Bearer header for sessions', async () => {
         const mockUser: JwtPayload = { sub: 'user-123', email: 'test@example.com', tokenType: 'access' };
         const validAccessToken = JwtUtil.sign(
            { sub: 'user-123', tokenType: 'access', jti: 'bearer-jti' },
            DEFAULT_DEV_RSA_PRIVATE_KEY,
            900,
         );
         const mockRequest = {
            cookies: {},
            headers: {
               authorization: `Bearer ${validAccessToken}`,
            },
         } as unknown as Request;

         mockAuthService.getSessions.mockResolvedValue([{ id: 'sess-1', deviceName: 'iOS App', isCurrent: true }]);

         const result = await controller.getSessions(mockUser, mockRequest);

         expect(mockAuthService.getSessions).toHaveBeenCalledWith('user-123', 'bearer-jti');
         expect(result).toHaveLength(1);
      });

      it('should revoke a session by session ID', async () => {
         const mockUser: JwtPayload = { sub: 'user-123', email: 'test@example.com', tokenType: 'access' };
         const mockRequest = { headers: {} } as unknown as Request;
         mockAuthService.revokeSession.mockResolvedValue(undefined);

         await controller.revokeSession(mockUser, 'sess-1', mockRequest);

         expect(mockAuthService.revokeSession).toHaveBeenCalledWith('user-123', 'sess-1', expect.any(Object));
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
            revokedCount: 2,
         });

         const result = await controller.revokeOtherSessions(mockUser, mockRequest);

         expect(mockAuthService.revokeOtherSessions).toHaveBeenCalledWith(
            'user-123',
            'current-jti',
            expect.any(Object),
         );
         expect(result.revokedCount).toBe(2);
      });
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

      mockAuthService.logoutAll.mockResolvedValue(undefined);

      await controller.logoutAll(user, mockRequest, mockResponse);

      expect(mockAuthService.logoutAll).toHaveBeenCalledWith('user-123', expect.any(Object));
      expect(mockClearCookie).toHaveBeenCalledWith(AUTH_COOKIES.ACCESS_TOKEN, mockConfigService.clearCookieOptions);
      expect(mockClearCookie).toHaveBeenCalledWith(AUTH_COOKIES.REFRESH_TOKEN, mockConfigService.clearCookieOptions);
   });

   it('should initiate changePassword and return OTP cooldown/expiration info', async () => {
      const mockRequest = { headers: {} } as unknown as Request;
      const user: JwtPayload = {
         sub: 'user-123',
         email: 'user@example.com',
         tokenType: 'access',
      };

      const changePasswordDto = {
         currentPassword: 'oldPassword123',
         newPassword: 'newPassword123',
         confirmPassword: 'newPassword123',
         logoutAll: true,
      };

      const mockResult = {
         success: true,
         message: 'AUTH.SEND_CHANGE_PASSWORD_OTP_SUCCESS',
         cooldownSeconds: 60,
         expiresInMinutes: 10,
      };

      mockAuthService.changePassword.mockResolvedValue(mockResult);

      const result = await controller.changePassword(user, changePasswordDto, mockRequest);

      expect(mockAuthService.changePassword).toHaveBeenCalledWith('user-123', changePasswordDto, expect.any(Object));
      expect(result).toEqual(mockResult);
   });

   it('should verifyChangePasswordOtp and clear cookies when logoutAll is true', async () => {
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

      const dto = {
         otp: '123456',
      };

      const mockResult = {
         success: true,
         message: 'AUTH.CHANGE_PASSWORD_SUCCESS',
         logoutAll: true,
      };

      mockAuthService.verifyChangePasswordOtp.mockResolvedValue(mockResult);

      const result = await controller.verifyChangePasswordOtp(user, dto, mockRequest, mockResponse);

      expect(mockAuthService.verifyChangePasswordOtp).toHaveBeenCalledWith('user-123', dto, expect.any(Object));
      expect(mockClearCookie).toHaveBeenCalledWith(AUTH_COOKIES.ACCESS_TOKEN, mockConfigService.clearCookieOptions);
      expect(mockClearCookie).toHaveBeenCalledWith(AUTH_COOKIES.REFRESH_TOKEN, mockConfigService.clearCookieOptions);
      expect(result).toEqual(mockResult);
   });

   it('should verifyChangePasswordOtp without clearing cookies when logoutAll is false', async () => {
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

      const dto = {
         otp: '123456',
      };

      const mockResult = {
         success: true,
         message: 'AUTH.CHANGE_PASSWORD_SUCCESS',
         logoutAll: false,
      };

      mockAuthService.verifyChangePasswordOtp.mockResolvedValue(mockResult);

      const result = await controller.verifyChangePasswordOtp(user, dto, mockRequest, mockResponse);

      expect(mockAuthService.verifyChangePasswordOtp).toHaveBeenCalledWith('user-123', dto, expect.any(Object));
      expect(mockClearCookie).not.toHaveBeenCalled();
      expect(result).toEqual(mockResult);
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
