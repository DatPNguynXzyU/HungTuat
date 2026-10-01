import {
   Body,
   Controller,
   Delete,
   Get,
   Headers,
   HttpCode,
   HttpStatus,
   Param,
   Post,
   Query,
   Req,
   Res,
} from '@nestjs/common';
import {
   ApiBearerAuth,
   ApiCookieAuth,
   ApiHeader,
   ApiOperation,
   ApiParam,
   ApiQuery,
   ApiResponse,
   ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import {
   AuditLogResponseDto,
   AUTH_COOKIES,
   AUTH_ERROR_CODES,
   AUTH_RESPONSE_MESSAGES,
   AuthResponseDto,
   AuthTokensDto,
   BadRequestException,
   ChangePasswordDto,
   ChangePasswordResponseDto,
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
   RefreshTokenRequestDto,
   RegisterDto,
   ResponseMessage,
   RevokeTokenRequestDto,
   SendRegisterOtpDto,
   SendRegisterOtpResponseDto,
   UnauthorizedException,
   VerifyChangePasswordOtpDto,
   VerifyChangePasswordOtpResponseDto,
   VerifyRegisterOtpDto,
   VerifyRegisterOtpResponseDto,
} from '@common';
import type { IRevokeSessionResult, JwtPayload } from '@common';
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

      if (refreshToken) {
         try {
            const payload = JwtUtil.decode(refreshToken);
            return payload?.jti;
         } catch {
            // Try from header or body if cookie decode fails
         }
      }

      // Fallback to Authorization header
      const authHeader = req?.headers?.authorization;
      if (authHeader?.startsWith('Bearer ')) {
         try {
            const token = authHeader.substring(7);
            const payload = JwtUtil.decode(token);
            return payload?.jti;
         } catch {
            // Ignore decode errors
         }
      }

      // Fallback to X-Refresh-Token header
      const refreshHeaderToken = req?.headers?.['x-refresh-token'];
      if (typeof refreshHeaderToken === 'string') {
         try {
            const payload = JwtUtil.decode(refreshHeaderToken);
            return payload?.jti;
         } catch {
            // Ignore decode errors
         }
      }

      return undefined;
   }

   private setAuthCookies(res: Response, tokens: { accessToken: string; refreshToken: string }): void {
      res.cookie(AUTH_COOKIES.ACCESS_TOKEN, tokens.accessToken, this.config.accessTokenCookieOptions);
      res.cookie(AUTH_COOKIES.REFRESH_TOKEN, tokens.refreshToken, this.config.refreshTokenCookieOptions);
   }

   private clearAuthCookies(res: Response): void {
      res.clearCookie(AUTH_COOKIES.ACCESS_TOKEN, this.config.clearCookieOptions);
      res.clearCookie(AUTH_COOKIES.REFRESH_TOKEN, this.config.clearCookieOptions);
   }

   private buildTokensDto(accessToken: string, refreshToken: string): AuthTokensDto {
      return {
         accessToken,
         refreshToken,
         tokenType: 'Bearer',
         expiresIn: this.config.jwtAccessTokenExpiresIn,
      };
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
   @Get('check-email')
   @HttpCode(HttpStatus.OK)
   @ApiOperation({
      summary: 'Check if an email is available for registration using fast Bloom Filter',
   })
   @ApiQuery({
      name: 'email',
      required: true,
      description: 'Email address to check',
      example: 'user@example.com',
   })
   @ApiResponse({
      status: 200,
      description: 'Email availability status returned.',
   })
   @ResponseMessage(AUTH_RESPONSE_MESSAGES.CHECK_EMAIL_SUCCESS)
   async checkEmail(@Query('email') email: string): Promise<{ available: boolean; email: string }> {
      if (!email || !email.trim()) {
         throw new BadRequestException(AUTH_ERROR_CODES.INVALID_EMAIL_FORMAT, {
            params: { reason: 'email_required' },
         });
      }
      return this.authService.checkEmail(email);
   }

   @Public()
   @Post('register/send-otp')
   @HttpCode(HttpStatus.OK)
   @ApiOperation({
      summary: 'Send 6-digit OTP verification code to email for registration (uses Bloom Filter for instant check)',
   })
   @ApiResponse({
      status: 200,
      description: 'OTP code sent successfully to user email.',
      type: SendRegisterOtpResponseDto,
   })
   @ApiResponse({
      status: 400,
      description: 'Email already exists or OTP cooldown is currently active.',
   })
   @ResponseMessage(AUTH_RESPONSE_MESSAGES.SEND_OTP_SUCCESS)
   async sendRegisterOtp(@Req() req: Request, @Body() dto: SendRegisterOtpDto): Promise<SendRegisterOtpResponseDto> {
      const deviceInfo = this.extractDeviceInfo(req);
      return this.authService.sendRegisterOtp(dto, deviceInfo);
   }

   @Public()
   @Post('register/verify-otp')
   @HttpCode(HttpStatus.OK)
   @ApiOperation({
      summary: 'Verify 6-digit OTP verification code and obtain a single-use verificationToken for registration',
   })
   @ApiResponse({
      status: 200,
      description: 'OTP verified successfully. Returns verificationToken.',
      type: VerifyRegisterOtpResponseDto,
   })
   @ApiResponse({
      status: 400,
      description: 'Invalid OTP code, expired OTP, or maximum attempts exceeded.',
   })
   @ResponseMessage(AUTH_RESPONSE_MESSAGES.VERIFY_OTP_SUCCESS)
   async verifyRegisterOtp(
      @Req() req: Request,
      @Body() dto: VerifyRegisterOtpDto,
   ): Promise<VerifyRegisterOtpResponseDto> {
      const deviceInfo = this.extractDeviceInfo(req);
      return this.authService.verifyRegisterOtp(dto, deviceInfo);
   }

   @Public()
   @Post('register')
   @HttpCode(HttpStatus.CREATED)
   @ApiOperation({
      summary:
         'Register a new account and automatically log in. Supports verificationToken from OTP step. Returns tokens in response body and HttpOnly cookies.',
   })
   @ApiHeader({
      name: 'X-Client-Type',
      required: false,
      description: 'Client type identifier (e.g., ios, android, web)',
      example: 'ios',
   })
   @ApiHeader({
      name: 'X-Device-Id',
      required: false,
      description: 'Unique device identifier for session tracking',
      example: 'device-uuid-123',
   })
   @ApiResponse({
      status: 201,
      description: 'User successfully registered. Tokens returned in response body and stored in HttpOnly cookies.',
      type: AuthResponseDto,
   })
   @ResponseMessage(AUTH_RESPONSE_MESSAGES.REGISTER_SUCCESS)
   async register(
      @Req() req: Request,
      @Body() registerDto: RegisterDto,
      @Res({ passthrough: true }) res: Response,
   ): Promise<AuthResponseDto> {
      const deviceInfo = this.extractDeviceInfo(req);
      const result = await this.authService.register(registerDto, deviceInfo);

      this.setAuthCookies(res, {
         accessToken: result.accessToken,
         refreshToken: result.refreshToken,
      });

      return {
         user: result.user,
         tokens: this.buildTokensDto(result.accessToken, result.refreshToken),
      };
   }

   @Public()
   @Post('login')
   @HttpCode(HttpStatus.OK)
   @ApiOperation({
      summary:
         'User login. Returns tokens in both response body (for mobile/API clients) and HttpOnly cookies (for web browsers)',
   })
   @ApiHeader({
      name: 'X-Client-Type',
      required: false,
      description: 'Client type identifier (e.g., ios, android, web)',
      example: 'android',
   })
   @ApiHeader({
      name: 'X-Device-Id',
      required: false,
      description: 'Unique device identifier for session tracking',
      example: 'device-uuid-456',
   })
   @ApiResponse({
      status: 200,
      description: 'User successfully logged in. Tokens returned in response body and stored in HttpOnly cookies.',
      type: AuthResponseDto,
   })
   @ResponseMessage(AUTH_RESPONSE_MESSAGES.LOGIN_SUCCESS)
   async login(
      @Req() req: Request,
      @Body() loginDto: LoginDto,
      @Res({ passthrough: true }) res: Response,
   ): Promise<AuthResponseDto> {
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
         tokens: this.buildTokensDto(result.accessToken, result.refreshToken),
      };
   }

   @Public()
   @Post('refresh')
   @HttpCode(HttpStatus.OK)
   @ApiOperation({
      summary:
         'Rotate and refresh tokens. Accepts refresh token from cookie, X-Refresh-Token header, or request body. Returns new tokens in both response body and cookies.',
   })
   @ApiHeader({
      name: 'X-Refresh-Token',
      required: false,
      description: 'Refresh token for mobile/API clients (alternative to cookie)',
      example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
   })
   @ApiHeader({
      name: 'X-Client-Type',
      required: false,
      description: 'Client type identifier',
      example: 'ios',
   })
   @ApiResponse({
      status: 200,
      description: 'Tokens rotated successfully. New tokens returned in response body and cookies.',
      type: AuthResponseDto,
   })
   @ApiResponse({ status: 401, description: 'Unauthorized if refresh token is missing, invalid or revoked.' })
   @ResponseMessage(AUTH_RESPONSE_MESSAGES.TOKEN_REFRESH_SUCCESS)
   async refreshToken(
      @Req() req: Request,
      @Res({ passthrough: true }) res: Response,
      @Body() body: RefreshTokenRequestDto,
      @Headers('x-refresh-token') headerRefreshToken?: string,
   ): Promise<AuthResponseDto> {
      const cookies = req.cookies as Record<string, string> | undefined;
      const token = cookies?.[AUTH_COOKIES.REFRESH_TOKEN] || headerRefreshToken || body?.refreshToken;

      if (!token) {
         throw new UnauthorizedException(AUTH_ERROR_CODES.REFRESH_TOKEN_REQUIRED, {
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
         tokens: this.buildTokensDto(result.accessToken, result.refreshToken),
      };
   }

   @Public()
   @Post('revoke')
   @HttpCode(HttpStatus.OK)
   @ApiBearerAuth()
   @ApiOperation({
      summary:
         'Revoke active token. Accepts token from cookie, Authorization header, or request body. Clears all auth cookies.',
   })
   @ApiHeader({
      name: 'X-Refresh-Token',
      required: false,
      description: 'Refresh token to revoke (alternative to cookie or Authorization header)',
      example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
   })
   @ApiResponse({ status: 200, description: 'Token revoked and cookies cleared successfully.' })
   @ResponseMessage(AUTH_RESPONSE_MESSAGES.TOKEN_REVOKE_SUCCESS)
   async revokeToken(
      @Req() req: Request,
      @Res({ passthrough: true }) res: Response,
      @Body() body: RevokeTokenRequestDto,
      @Headers('authorization') authHeader?: string,
      @Headers('x-refresh-token') headerRefreshToken?: string,
   ): Promise<void> {
      const cookies = req.cookies as Record<string, string> | undefined;

      let token =
         cookies?.[AUTH_COOKIES.REFRESH_TOKEN] ||
         cookies?.[AUTH_COOKIES.ACCESS_TOKEN] ||
         headerRefreshToken ||
         body?.token;

      // Extract from Authorization: Bearer header
      if (!token && authHeader?.startsWith('Bearer ')) {
         token = authHeader.substring(7);
      }

      const deviceInfo = this.extractDeviceInfo(req);

      if (token) {
         await this.authService.revokeToken(token, deviceInfo);
      }

      this.clearAuthCookies(res);
   }

   @Public()
   @Post('logout')
   @HttpCode(HttpStatus.OK)
   @ApiBearerAuth()
   @ApiOperation({
      summary:
         'User logout. Accepts token from cookie or Authorization header. Revokes refresh token and clears auth cookies.',
   })
   @ApiResponse({ status: 200, description: 'User successfully logged out.' })
   @ResponseMessage(AUTH_RESPONSE_MESSAGES.LOGOUT_SUCCESS)
   async logout(
      @Req() req: Request,
      @Res({ passthrough: true }) res: Response,
      @Headers('authorization') authHeader?: string,
   ): Promise<void> {
      const cookies = req.cookies as Record<string, string> | undefined;
      let refreshToken = cookies?.[AUTH_COOKIES.REFRESH_TOKEN];

      // Extract from Authorization: Bearer header if no cookie
      if (!refreshToken && authHeader?.startsWith('Bearer ')) {
         refreshToken = authHeader.substring(7);
      }

      const deviceInfo = this.extractDeviceInfo(req);

      if (refreshToken) {
         await this.authService.revokeToken(refreshToken, deviceInfo);
      }

      this.clearAuthCookies(res);
   }

   @Post('logout-all')
   @HttpCode(HttpStatus.OK)
   @ApiCookieAuth()
   @ApiBearerAuth()
   @ApiOperation({
      summary: 'Revoke all sessions/tokens for the current user across all devices and clear auth cookies',
   })
   @ApiResponse({ status: 200, description: 'All user sessions logged out successfully.' })
   @ResponseMessage(AUTH_RESPONSE_MESSAGES.LOGOUT_ALL_SUCCESS)
   async logoutAll(
      @CurrentUser() user: JwtPayload,
      @Req() req: Request,
      @Res({ passthrough: true }) res: Response,
   ): Promise<void> {
      const deviceInfo = this.extractDeviceInfo(req);
      if (user?.sub) {
         await this.authService.logoutAll(user.sub, deviceInfo);
      }

      this.clearAuthCookies(res);
   }

   @Get('sessions')
   @HttpCode(HttpStatus.OK)
   @ApiCookieAuth()
   @ApiBearerAuth()
   @ApiOperation({
      summary:
         'Get list of all active sessions and logged-in devices for the current user. Supports both cookie and Bearer token authentication.',
   })
   @ApiResponse({
      status: 200,
      description: 'Active sessions and devices retrieved successfully.',
      type: [DeviceSessionResponseDto],
   })
   @ResponseMessage(AUTH_RESPONSE_MESSAGES.GET_SESSIONS_SUCCESS)
   async getSessions(@CurrentUser() user: JwtPayload, @Req() req: Request): Promise<IUserSessionInfo[]> {
      const currentJti = this.extractCurrentJti(req);
      return this.authService.getSessions(user.sub, currentJti);
   }

   @Delete('sessions/:sessionId')
   @HttpCode(HttpStatus.OK)
   @ApiCookieAuth()
   @ApiBearerAuth()
   @ApiOperation({
      summary:
         'Revoke and log out a specific session/device by session ID. Supports both cookie and Bearer token authentication.',
   })
   @ApiParam({ name: 'sessionId', description: 'Session UUID to revoke', type: String })
   @ApiResponse({ status: 200, description: 'Session revoked successfully.' })
   @ResponseMessage(AUTH_RESPONSE_MESSAGES.REVOKE_SESSION_SUCCESS)
   async revokeSession(
      @CurrentUser() user: JwtPayload,
      @Param('sessionId') sessionId: string,
      @Req() req: Request,
   ): Promise<void> {
      const deviceInfo = this.extractDeviceInfo(req);
      await this.authService.revokeSession(user.sub, sessionId, deviceInfo);
   }

   @Post('sessions/revoke-others')
   @HttpCode(HttpStatus.OK)
   @ApiCookieAuth()
   @ApiBearerAuth()
   @ApiOperation({
      summary:
         'Revoke and log out all other active sessions except the current device session. Supports both cookie and Bearer token authentication.',
   })
   @ApiResponse({ status: 200, description: 'All other sessions revoked successfully.' })
   @ResponseMessage(AUTH_RESPONSE_MESSAGES.REVOKE_OTHER_SESSIONS_SUCCESS)
   async revokeOtherSessions(@CurrentUser() user: JwtPayload, @Req() req: Request): Promise<IRevokeSessionResult> {
      const currentJti = this.extractCurrentJti(req);
      if (!currentJti) {
         throw new BadRequestException(AUTH_ERROR_CODES.CURRENT_SESSION_REQUIRED, {
            params: { reason: 'refresh_token_missing' },
         });
      }

      const deviceInfo = this.extractDeviceInfo(req);
      return this.authService.revokeOtherSessions(user.sub, currentJti, deviceInfo);
   }

   @Post('change-password')
   @HttpCode(HttpStatus.OK)
   @ApiCookieAuth()
   @ApiBearerAuth()
   @ApiOperation({
      summary:
         'Initiate password change by validating current password and sending OTP verification code to account email.',
   })
   @ApiResponse({
      status: 200,
      description: 'Current password verified and OTP sent successfully',
      type: ChangePasswordResponseDto,
   })
   @ApiResponse({ status: 400, description: 'Current password invalid, same as new password, or OTP cooldown active' })
   @ResponseMessage(AUTH_RESPONSE_MESSAGES.SEND_CHANGE_PASSWORD_OTP_SUCCESS)
   async changePassword(
      @CurrentUser() user: JwtPayload,
      @Body() changePasswordDto: ChangePasswordDto,
      @Req() req: Request,
   ): Promise<ChangePasswordResponseDto> {
      const deviceInfo = this.extractDeviceInfo(req);
      return this.authService.changePassword(user.sub, changePasswordDto, deviceInfo);
   }

   @Post('change-password/verify-otp')
   @HttpCode(HttpStatus.OK)
   @ApiCookieAuth()
   @ApiBearerAuth()
   @ApiOperation({
      summary:
         'Verify OTP code and finalize password change, with automatic session revocation if logoutAll was selected.',
   })
   @ApiResponse({
      status: 200,
      description: 'Password changed successfully via OTP verification',
      type: VerifyChangePasswordOtpResponseDto,
   })
   @ApiResponse({ status: 400, description: 'OTP invalid, expired, or maximum attempts exceeded' })
   @ResponseMessage(AUTH_RESPONSE_MESSAGES.CHANGE_PASSWORD_SUCCESS)
   async verifyChangePasswordOtp(
      @CurrentUser() user: JwtPayload,
      @Body() dto: VerifyChangePasswordOtpDto,
      @Req() req: Request,
      @Res({ passthrough: true }) res: Response,
   ): Promise<VerifyChangePasswordOtpResponseDto> {
      const deviceInfo = this.extractDeviceInfo(req);
      const result = await this.authService.verifyChangePasswordOtp(user.sub, dto, deviceInfo);

      if (result.logoutAll) {
         this.clearAuthCookies(res);
      }

      return result;
   }

   @Get('security-logs')
   @HttpCode(HttpStatus.OK)
   @ApiCookieAuth()
   @ApiBearerAuth()
   @ApiOperation({
      summary:
         'Get security audit logs for the current authenticated user (SOC 2, GDPR user access). Supports both cookie and Bearer token authentication.',
   })
   @ApiResponse({
      status: 200,
      description: 'User security audit logs retrieved successfully',
      type: [AuditLogResponseDto],
   })
   @ResponseMessage(AUTH_RESPONSE_MESSAGES.GET_SECURITY_LOGS_SUCCESS)
   async getSecurityLogs(
      @CurrentUser() user: JwtPayload,
      @Query() query: PaginationQueryDto,
   ): Promise<IAuditLogListResult> {
      return this.authService.getUserAuditLogs(user.sub, query.page, query.limit);
   }

   @Get('me')
   @ApiCookieAuth()
   @ApiBearerAuth()
   @ApiOperation({
      summary: 'Get current authenticated user profile. Supports both cookie and Bearer token authentication.',
   })
   @ApiResponse({ status: 200, description: 'Current user profile returned.' })
   @ApiResponse({ status: 401, description: 'Unauthorized if authentication is missing or invalid.' })
   @ResponseMessage(AUTH_RESPONSE_MESSAGES.GET_PROFILE_SUCCESS)
   getProfile(@CurrentUser() user: JwtPayload): JwtPayload {
      return user;
   }
}
