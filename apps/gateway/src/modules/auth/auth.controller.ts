import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, Req, Res } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import {
   AuditLogResponseDto,
   AUTH_COOKIES,
   BadRequestException,
   ChangePasswordDto,
   CurrentUser,
   DeviceDetectorUtil,
   DeviceSessionResponseDto,
   IAuditLogListResult,
   IDeviceInfo,
   IJwksResponse,
   IUserSessionInfo,
   JwtUtil,
   LoginDto,
   PaginationQueryDto,
   Public,
   RegisterDto,
   ResponseMessage,
   UnauthorizedException,
} from '@common';
import type { JwtPayload } from '@common';
import { GatewayConfigService } from '@/config';
import { AuthService } from '@/modules/auth/auth.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
   constructor(
      private readonly authService: AuthService,
      private readonly config: GatewayConfigService,
   ) {}

   private extractClientIp(req?: Request): string {
      if (!req) {
         return '127.0.0.1';
      }
      const forwarded = req.headers?.['x-forwarded-for'];
      if (typeof forwarded === 'string') {
         return forwarded.split(',')[0].trim();
      }
      if (Array.isArray(forwarded) && forwarded.length > 0) {
         return forwarded[0].trim();
      }
      const realIp = req.headers?.['x-real-ip'];
      if (typeof realIp === 'string') {
         return realIp.trim();
      }
      return req.ip || req.socket?.remoteAddress || '127.0.0.1';
   }

   private extractDeviceInfo(req?: Request): IDeviceInfo {
      const userAgent = req?.headers?.['user-agent'];
      const clientIp = this.extractClientIp(req);
      return DeviceDetectorUtil.parse(typeof userAgent === 'string' ? userAgent : undefined, clientIp);
   }

   private extractCurrentJti(req?: Request): string | undefined {
      const cookies = req?.cookies as Record<string, string> | undefined;
      const refreshToken = cookies?.[AUTH_COOKIES.REFRESH_TOKEN];
      if (!refreshToken) {
         return undefined;
      }
      try {
         const payload = JwtUtil.decode(refreshToken);
         return payload?.jti;
      } catch {
         return undefined;
      }
   }

   private setAuthCookies(res: Response, tokens: { accessToken: string; refreshToken: string }): void {
      res.cookie(AUTH_COOKIES.ACCESS_TOKEN, tokens.accessToken, this.config.accessTokenCookieOptions);
      res.cookie(AUTH_COOKIES.REFRESH_TOKEN, tokens.refreshToken, this.config.refreshTokenCookieOptions);
   }

   private clearAuthCookies(res: Response): void {
      res.clearCookie(AUTH_COOKIES.ACCESS_TOKEN, this.config.clearCookieOptions);
      res.clearCookie(AUTH_COOKIES.REFRESH_TOKEN, this.config.clearCookieOptions);
   }

   @Public()
   @Get('.well-known/jwks.json')
   @HttpCode(HttpStatus.OK)
   @ApiOperation({ summary: 'Get JSON Web Key Set (JWKS) public keys for JWT RS256 token verification' })
   @ApiResponse({ status: 200, description: 'JWKS public keys returned successfully.' })
   async getJwks(): Promise<IJwksResponse> {
      try {
         return await this.authService.getJwks();
      } catch {
         // Fallback to locally configured public key if microservice call fails
         return JwtUtil.generateJwks(this.config.jwtPublicKey, this.config.jwtKeyId);
      }
   }

   @Public()
   @Get('jwks.json')
   @HttpCode(HttpStatus.OK)
   @ApiOperation({ summary: 'Get JSON Web Key Set (JWKS) public keys (alias)' })
   @ApiResponse({ status: 200, description: 'JWKS public keys returned successfully.' })
   async getJwksAlias(): Promise<IJwksResponse> {
      return this.getJwks();
   }

   @Public()
   @Post('register')
   @HttpCode(HttpStatus.CREATED)
   @ApiOperation({
      summary:
         'Register a new account and automatically log in with dual HttpOnly cookies (access_token & refresh_token)',
   })
   @ApiResponse({ status: 201, description: 'User successfully registered and dual tokens stored in cookies.' })
   @ResponseMessage('AUTH.REGISTER_SUCCESS')
   async register(
      @Req() req: Request,
      @Body() registerDto: RegisterDto,
      @Res({ passthrough: true }) res: Response,
   ): Promise<{ user: unknown }> {
      const deviceInfo = this.extractDeviceInfo(req);
      const result = await this.authService.register(registerDto, deviceInfo);

      this.setAuthCookies(res, {
         accessToken: result.accessToken,
         refreshToken: result.refreshToken,
      });

      return {
         user: result.user,
      };
   }

   @Public()
   @Post('login')
   @HttpCode(HttpStatus.OK)
   @ApiOperation({ summary: 'User login with dual tokens stored in HttpOnly cookies' })
   @ApiResponse({ status: 200, description: 'User successfully logged in with dual cookies.' })
   @ResponseMessage('AUTH.LOGIN_SUCCESS')
   async login(
      @Req() req: Request,
      @Body() loginDto: LoginDto,
      @Res({ passthrough: true }) res: Response,
   ): Promise<{ user: unknown }> {
      const deviceInfo = this.extractDeviceInfo(req);
      const result = await this.authService.login(
         {
            ...loginDto,
            ip: loginDto.ip || deviceInfo.ipAddress,
         },
         deviceInfo,
      );

      this.setAuthCookies(res, {
         accessToken: result.accessToken,
         refreshToken: result.refreshToken,
      });

      return {
         user: result.user,
      };
   }

   @Public()
   @Post('refresh')
   @HttpCode(HttpStatus.OK)
   @ApiOperation({ summary: 'Rotate and refresh tokens using refresh_token stored in cookie' })
   @ApiResponse({ status: 200, description: 'Tokens rotated and new cookies set successfully.' })
   @ApiResponse({ status: 401, description: 'Unauthorized if refresh token is missing, invalid or revoked.' })
   @ResponseMessage('AUTH.TOKEN_REFRESH_SUCCESS')
   async refreshToken(
      @Req() req: Request,
      @Res({ passthrough: true }) res: Response,
      @Body('refreshToken') bodyRefreshToken?: string,
   ): Promise<{ user: unknown }> {
      const cookies = req.cookies as Record<string, string> | undefined;
      const token = cookies?.[AUTH_COOKIES.REFRESH_TOKEN] || bodyRefreshToken;

      if (!token) {
         throw new UnauthorizedException('AUTH.REFRESH_TOKEN_REQUIRED', {
            params: { reason: 'refresh_token_missing' },
         });
      }

      const deviceInfo = this.extractDeviceInfo(req);
      const result = await this.authService.refreshToken(token, deviceInfo);

      this.setAuthCookies(res, {
         accessToken: result.accessToken,
         refreshToken: result.refreshToken,
      });

      return {
         user: result.user,
      };
   }

   @Public()
   @Post('revoke')
   @HttpCode(HttpStatus.OK)
   @ApiOperation({ summary: 'Revoke active refresh token and clear all auth cookies' })
   @ApiResponse({ status: 200, description: 'Token revoked and cookies cleared successfully.' })
   @ResponseMessage('AUTH.TOKEN_REVOKE_SUCCESS')
   async revokeToken(
      @Req() req: Request,
      @Res({ passthrough: true }) res: Response,
      @Body('token') bodyToken?: string,
   ): Promise<{ message: string }> {
      const cookies = req.cookies as Record<string, string> | undefined;
      const token = cookies?.[AUTH_COOKIES.REFRESH_TOKEN] || bodyToken || cookies?.[AUTH_COOKIES.ACCESS_TOKEN];
      const deviceInfo = this.extractDeviceInfo(req);

      if (token) {
         await this.authService.revokeToken(token, deviceInfo);
      }

      this.clearAuthCookies(res);

      return {
         message: 'Token revoked and logged out successfully',
      };
   }

   @Public()
   @Post('logout')
   @HttpCode(HttpStatus.OK)
   @ApiOperation({ summary: 'User logout, revoke refresh token and clear auth cookies' })
   @ApiResponse({ status: 200, description: 'User successfully logged out.' })
   @ResponseMessage('AUTH.LOGOUT_SUCCESS')
   async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<{ message: string }> {
      const cookies = req.cookies as Record<string, string> | undefined;
      const refreshToken = cookies?.[AUTH_COOKIES.REFRESH_TOKEN];
      const deviceInfo = this.extractDeviceInfo(req);

      if (refreshToken) {
         await this.authService.revokeToken(refreshToken, deviceInfo);
      }

      this.clearAuthCookies(res);

      return {
         message: 'Logged out successfully',
      };
   }

   @Post('logout-all')
   @HttpCode(HttpStatus.OK)
   @ApiCookieAuth()
   @ApiOperation({
      summary: 'Revoke all sessions/tokens for the current user across all devices and clear auth cookies',
   })
   @ApiResponse({ status: 200, description: 'All user sessions logged out successfully.' })
   @ResponseMessage('AUTH.LOGOUT_ALL_SUCCESS')
   async logoutAll(
      @CurrentUser() user: JwtPayload,
      @Req() req: Request,
      @Res({ passthrough: true }) res: Response,
   ): Promise<{ message: string }> {
      const deviceInfo = this.extractDeviceInfo(req);
      if (user?.sub) {
         await this.authService.logoutAll(user.sub, deviceInfo);
      }

      this.clearAuthCookies(res);

      return {
         message: 'All sessions logged out successfully',
      };
   }

   @Get('sessions')
   @HttpCode(HttpStatus.OK)
   @ApiCookieAuth()
   @ApiOperation({ summary: 'Get list of all active sessions and logged-in devices for the current user' })
   @ApiResponse({
      status: 200,
      description: 'Active sessions and devices retrieved successfully.',
      type: [DeviceSessionResponseDto],
   })
   @ResponseMessage('AUTH.GET_SESSIONS_SUCCESS')
   async getSessions(@CurrentUser() user: JwtPayload, @Req() req: Request): Promise<IUserSessionInfo[]> {
      const currentJti = this.extractCurrentJti(req);
      return this.authService.getSessions(user.sub, currentJti);
   }

   @Delete('sessions/:sessionId')
   @HttpCode(HttpStatus.OK)
   @ApiCookieAuth()
   @ApiOperation({ summary: 'Revoke and log out a specific session/device by session ID' })
   @ApiParam({ name: 'sessionId', description: 'Session UUID to revoke', type: String })
   @ApiResponse({ status: 200, description: 'Session revoked successfully.' })
   @ResponseMessage('AUTH.REVOKE_SESSION_SUCCESS')
   async revokeSession(
      @CurrentUser() user: JwtPayload,
      @Param('sessionId') sessionId: string,
      @Req() req: Request,
   ): Promise<{ message: string }> {
      const deviceInfo = this.extractDeviceInfo(req);
      const result = await this.authService.revokeSession(user.sub, sessionId, deviceInfo);
      return {
         message: result.message,
      };
   }

   @Post('sessions/revoke-others')
   @HttpCode(HttpStatus.OK)
   @ApiCookieAuth()
   @ApiOperation({ summary: 'Revoke and log out all other active sessions except the current device session' })
   @ApiResponse({ status: 200, description: 'All other sessions revoked successfully.' })
   @ResponseMessage('AUTH.REVOKE_OTHER_SESSIONS_SUCCESS')
   async revokeOtherSessions(
      @CurrentUser() user: JwtPayload,
      @Req() req: Request,
   ): Promise<{ message: string; revokedCount?: number }> {
      const currentJti = this.extractCurrentJti(req);
      if (!currentJti) {
         throw new BadRequestException('AUTH.CURRENT_SESSION_REQUIRED', {
            params: { reason: 'refresh_token_missing' },
         });
      }

      const deviceInfo = this.extractDeviceInfo(req);
      const result = await this.authService.revokeOtherSessions(user.sub, currentJti, deviceInfo);
      return {
         message: result.message,
         revokedCount: result.revokedCount,
      };
   }

   @Post('change-password')
   @HttpCode(HttpStatus.OK)
   @ApiCookieAuth()
   @ApiOperation({ summary: 'Change password and revoke all active sessions across all devices' })
   @ApiResponse({ status: 200, description: 'Password changed successfully and all sessions revoked.' })
   @ApiResponse({ status: 400, description: 'Current password invalid or same as new password.' })
   @ResponseMessage('AUTH.CHANGE_PASSWORD_SUCCESS')
   async changePassword(
      @CurrentUser() user: JwtPayload,
      @Body() changePasswordDto: ChangePasswordDto,
      @Req() req: Request,
      @Res({ passthrough: true }) res: Response,
   ): Promise<{ message: string }> {
      const deviceInfo = this.extractDeviceInfo(req);
      const result = await this.authService.changePassword(user.sub, changePasswordDto, deviceInfo);

      this.clearAuthCookies(res);

      return {
         message: result.message,
      };
   }

   @Get('security-logs')
   @HttpCode(HttpStatus.OK)
   @ApiCookieAuth()
   @ApiOperation({
      summary: 'Get security audit logs for the current authenticated user (SOC 2, GDPR user access)',
   })
   @ApiResponse({
      status: 200,
      description: 'User security audit logs retrieved successfully.',
      type: [AuditLogResponseDto],
   })
   @ResponseMessage('AUTH.GET_SECURITY_LOGS_SUCCESS')
   async getSecurityLogs(
      @CurrentUser() user: JwtPayload,
      @Query() query: PaginationQueryDto,
   ): Promise<IAuditLogListResult> {
      return this.authService.getUserAuditLogs(user.sub, query.page, query.limit);
   }

   @Get('me')
   @ApiCookieAuth()
   @ApiOperation({ summary: 'Get current authenticated user profile using cookie' })
   @ApiResponse({ status: 200, description: 'Current user profile returned.' })
   @ApiResponse({ status: 401, description: 'Unauthorized if cookie is missing or invalid.' })
   @ResponseMessage('AUTH.GET_PROFILE_SUCCESS')
   getProfile(@CurrentUser() user: JwtPayload): JwtPayload {
      return user;
   }
}
