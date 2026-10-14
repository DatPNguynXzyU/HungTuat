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
   ApiErrorResponse,
   ApiErrorResponses,
   BadRequestException,
   COMMON_ERROR_CODES,
   CurrentAccount,
   CurrentUser,
   DeviceDetectorUtil,
   IDeviceInfo,
   JwtUtil,
   PaginationQueryDto,
   Public,
   ResponseMessage,
   UnauthorizedException,
} from '@common';
import {
   AuditLogResponseDto,
   AUTH_COOKIES,
   AUTH_ERROR_CODES,
   AUTH_ERROR_REASONS,
   AUTH_RESPONSE_MESSAGES,
   AuthProfileResponseDto,
   AuthResponseDto,
   AuthTokensDto,
   ChangePasswordDto,
   ChangePasswordResponseDto,
   CheckEmailResponseDto,
   DeviceSessionResponseDto,
   IAuditLogListResult,
   IJwksResponse,
   IRevokeSessionResult,
   IUserSessionInfo,
   JwksResponseDto,
   LoginDto,
   RefreshTokenRequestDto,
   RegisterDto,
   RevokeSessionResultDto,
   RevokeTokenRequestDto,
   SendRegisterOtpDto,
   SendRegisterOtpResponseDto,
   SimpleSuccessResponseDto,
   UserEmailResponseDto,
   VerifyChangePasswordOtpDto,
   VerifyChangePasswordOtpResponseDto,
   VerifyRegisterOtpDto,
   VerifyRegisterOtpResponseDto,
} from '@contracts/auth';
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
      const refreshToken = cookies?.[this.config.refreshTokenCookieName] || cookies?.[AUTH_COOKIES.REFRESH_TOKEN];

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
      res.cookie(this.config.accessTokenCookieName, tokens.accessToken, this.config.accessTokenCookieOptions);
      res.cookie(this.config.refreshTokenCookieName, tokens.refreshToken, this.config.refreshTokenCookieOptions);
   }

   private clearAuthCookies(res: Response): void {
      res.clearCookie(this.config.accessTokenCookieName, this.config.clearCookieOptions);
      res.clearCookie(this.config.refreshTokenCookieName, this.config.clearCookieOptions);
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
   @ApiOperation({
      operationId: 'getJwks',
      summary: 'Get JSON Web Key Set (JWKS) public keys for JWT RS256 token verification',
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'JWKS public keys returned successfully.',
      type: JwksResponseDto,
   })
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
   @ApiOperation({
      operationId: 'getJwksAlias',
      summary: 'Get JSON Web Key Set (JWKS) public keys (alias)',
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'JWKS public keys returned successfully.',
      type: JwksResponseDto,
   })
   async getJwksAlias(): Promise<IJwksResponse> {
      return this.getJwks();
   }

   @Public()
   @Get('check-email')
   @HttpCode(HttpStatus.OK)
   @ApiOperation({
      operationId: 'checkEmail',
      summary: 'Check if an email is available for registration using fast Bloom Filter',
   })
   @ApiQuery({
      name: 'email',
      required: true,
      description: 'Email address to check',
      example: 'user@example.com',
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Email availability status returned.',
      type: CheckEmailResponseDto,
   })
   @ApiErrorResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Invalid or missing email address',
      errorCodes: [AUTH_ERROR_CODES.INVALID_EMAIL_FORMAT],
      exampleParams: { reason: AUTH_ERROR_REASONS.EMAIL_REQUIRED },
   })
   @ResponseMessage(AUTH_RESPONSE_MESSAGES.CHECK_EMAIL_SUCCESS)
   async checkEmail(@Query('email') email: string): Promise<CheckEmailResponseDto> {
      if (!email || !email.trim()) {
         throw new BadRequestException(AUTH_ERROR_CODES.INVALID_EMAIL_FORMAT, {
            params: { reason: AUTH_ERROR_REASONS.EMAIL_REQUIRED },
         });
      }
      return this.authService.checkEmail(email);
   }

   @Public()
   @Post('register/send-otp')
   @HttpCode(HttpStatus.OK)
   @ApiOperation({
      operationId: 'sendRegisterOtp',
      summary: 'Send 6-digit OTP verification code to email for registration (uses Bloom Filter for instant check)',
   })
   @ApiResponse({
      status: 200,
      description: 'OTP code sent successfully to user email.',
      type: SendRegisterOtpResponseDto,
      links: {
         VerifyOtp: {
            operationId: 'verifyRegisterOtp',
            description: 'Verify the 6-digit OTP code received via email in the next step',
            parameters: {
               email: '$request.body#/email',
            },
         },
      },
   })
   @ApiErrorResponses([
      {
         status: HttpStatus.BAD_REQUEST,
         description: 'Email already exists, invalid email format, or OTP cooldown active',
         errorCodes: [
            AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS,
            AUTH_ERROR_CODES.INVALID_EMAIL_FORMAT,
            AUTH_ERROR_CODES.OTP_COOLDOWN_ACTIVE,
         ],
         exampleParams: { cooldownSeconds: 60 },
      },
      {
         status: HttpStatus.TOO_MANY_REQUESTS,
         description: 'Maximum daily OTP limit exceeded',
         errorCodes: [AUTH_ERROR_CODES.OTP_MAX_ATTEMPTS_EXCEEDED],
      },
   ])
   @ResponseMessage(AUTH_RESPONSE_MESSAGES.SEND_OTP_SUCCESS)
   async sendRegisterOtp(@Req() req: Request, @Body() dto: SendRegisterOtpDto): Promise<SendRegisterOtpResponseDto> {
      const deviceInfo = this.extractDeviceInfo(req);
      return this.authService.sendRegisterOtp(dto, deviceInfo);
   }

   @Public()
   @Post('register/verify-otp')
   @HttpCode(HttpStatus.OK)
   @ApiOperation({
      operationId: 'verifyRegisterOtp',
      summary: 'Verify 6-digit OTP verification code and obtain a single-use verificationToken for registration',
   })
   @ApiResponse({
      status: 200,
      description: 'OTP verified successfully. Returns verificationToken.',
      type: VerifyRegisterOtpResponseDto,
      links: {
         RegisterAccount: {
            operationId: 'registerAccount',
            description: 'Complete account registration using the verificationToken and email from the OTP step',
            parameters: {
               verificationToken: '$response.body#/data/verificationToken',
               email: '$response.body#/data/email',
            },
         },
      },
   })
   @ApiErrorResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Invalid OTP code, expired OTP, or maximum OTP attempts exceeded',
      errorCodes: [
         AUTH_ERROR_CODES.OTP_INVALID,
         AUTH_ERROR_CODES.OTP_EXPIRED,
         AUTH_ERROR_CODES.OTP_MAX_ATTEMPTS_EXCEEDED,
      ],
      exampleParams: { remainingAttempts: 2 },
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
      operationId: 'registerAccount',
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
      links: {
         GetAuthProfile: {
            operationId: 'getAuthProfile',
            description: 'Retrieve authenticated user profile and token payload after successful registration',
         },
      },
   })
   @ApiErrorResponses([
      {
         status: HttpStatus.BAD_REQUEST,
         description: 'Validation failed or invalid/expired verification token',
         errorCodes: [
            COMMON_ERROR_CODES.VALIDATION_FAILED,
            AUTH_ERROR_CODES.VERIFICATION_TOKEN_INVALID,
            AUTH_ERROR_CODES.VERIFICATION_TOKEN_EXPIRED,
         ],
      },
      {
         status: HttpStatus.CONFLICT,
         description: 'Email already registered',
         errorCodes: [AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS],
         exampleParams: { email: 'user@example.com' },
      },
   ])
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
      operationId: 'loginAccount',
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
      links: {
         GetAuthProfile: {
            operationId: 'getAuthProfile',
            description: 'Retrieve authenticated user profile and token payload after successful login',
         },
      },
   })
   @ApiErrorResponses([
      {
         status: HttpStatus.BAD_REQUEST,
         description: 'Validation failed for login payload',
         errorCodes: [COMMON_ERROR_CODES.VALIDATION_FAILED],
      },
      {
         status: HttpStatus.UNAUTHORIZED,
         description: 'Invalid credentials, locked/blocked account, or inactive user',
         errorCodes: [
            AUTH_ERROR_CODES.INVALID_CREDENTIALS,
            AUTH_ERROR_CODES.USER_NOT_FOUND,
            AUTH_ERROR_CODES.ACCOUNT_BLOCKED,
            AUTH_ERROR_CODES.ACCOUNT_INACTIVE,
            AUTH_ERROR_CODES.ACCOUNT_LOCKED_TEMPORARILY,
         ],
         exampleParams: { lockedUntil: '2026-10-10T09:00:00.000Z' },
      },
   ])
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
   @ApiErrorResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Refresh token missing, invalid, expired, or revoked',
      errorCodes: [
         AUTH_ERROR_CODES.REFRESH_TOKEN_REQUIRED,
         AUTH_ERROR_CODES.REFRESH_TOKEN_INVALID,
         AUTH_ERROR_CODES.REFRESH_TOKEN_REVOKED,
         AUTH_ERROR_CODES.REFRESH_TOKEN_EXPIRED,
         AUTH_ERROR_CODES.TOKEN_REVOKED,
      ],
      exampleParams: { reason: AUTH_ERROR_REASONS.REFRESH_TOKEN_MISSING },
   })
   @ResponseMessage(AUTH_RESPONSE_MESSAGES.TOKEN_REFRESH_SUCCESS)
   async refreshToken(
      @Req() req: Request,
      @Res({ passthrough: true }) res: Response,
      @Body() body: RefreshTokenRequestDto,
      @Headers('x-refresh-token') headerRefreshToken?: string,
   ): Promise<AuthResponseDto> {
      const cookies = req.cookies as Record<string, string> | undefined;
      const token =
         cookies?.[this.config.refreshTokenCookieName] ||
         cookies?.[AUTH_COOKIES.REFRESH_TOKEN] ||
         headerRefreshToken ||
         body?.refreshToken;

      if (!token) {
         throw new UnauthorizedException(AUTH_ERROR_CODES.REFRESH_TOKEN_REQUIRED, {
            params: { reason: AUTH_ERROR_REASONS.REFRESH_TOKEN_MISSING },
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
      operationId: 'revokeToken',
      summary:
         'Revoke active token. Accepts token from cookie, Authorization header, or request body. Clears all auth cookies.',
   })
   @ApiHeader({
      name: 'X-Refresh-Token',
      required: false,
      description: 'Refresh token to revoke (alternative to cookie or Authorization header)',
      example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Token revoked and cookies cleared successfully.',
      type: SimpleSuccessResponseDto,
   })
   @ApiErrorResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Token invalid or expired',
      errorCodes: [AUTH_ERROR_CODES.TOKEN_INVALID_OR_EXPIRED],
   })
   @ResponseMessage(AUTH_RESPONSE_MESSAGES.TOKEN_REVOKE_SUCCESS)
   async revokeToken(
      @Req() req: Request,
      @Res({ passthrough: true }) res: Response,
      @Body() body: RevokeTokenRequestDto,
      @Headers('authorization') authHeader?: string,
      @Headers('x-refresh-token') headerRefreshToken?: string,
   ): Promise<SimpleSuccessResponseDto> {
      const cookies = req.cookies as Record<string, string> | undefined;

      let token =
         cookies?.[this.config.refreshTokenCookieName] ||
         cookies?.[AUTH_COOKIES.REFRESH_TOKEN] ||
         cookies?.[this.config.accessTokenCookieName] ||
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
      return { success: true, message: AUTH_RESPONSE_MESSAGES.TOKEN_REVOKE_SUCCESS };
   }

   @Public()
   @Post('logout')
   @HttpCode(HttpStatus.OK)
   @ApiBearerAuth()
   @ApiOperation({
      operationId: 'logout',
      summary:
         'User logout. Accepts token from cookie or Authorization header. Revokes refresh token and clears auth cookies.',
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'User successfully logged out.',
      type: SimpleSuccessResponseDto,
   })
   @ApiErrorResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Authentication token missing or expired',
      errorCodes: [AUTH_ERROR_CODES.TOKEN_INVALID_OR_EXPIRED],
   })
   @ResponseMessage(AUTH_RESPONSE_MESSAGES.LOGOUT_SUCCESS)
   async logout(
      @Req() req: Request,
      @Res({ passthrough: true }) res: Response,
      @Headers('authorization') authHeader?: string,
   ): Promise<SimpleSuccessResponseDto> {
      const cookies = req.cookies as Record<string, string> | undefined;
      let refreshToken = cookies?.[this.config.refreshTokenCookieName] || cookies?.[AUTH_COOKIES.REFRESH_TOKEN];

      // Extract from Authorization: Bearer header if no cookie
      if (!refreshToken && authHeader?.startsWith('Bearer ')) {
         refreshToken = authHeader.substring(7);
      }

      const deviceInfo = this.extractDeviceInfo(req);

      if (refreshToken) {
         await this.authService.revokeToken(refreshToken, deviceInfo);
      }

      this.clearAuthCookies(res);
      return { success: true, message: AUTH_RESPONSE_MESSAGES.LOGOUT_SUCCESS };
   }

   @Post('logout-all')
   @HttpCode(HttpStatus.OK)
   @ApiCookieAuth()
   @ApiBearerAuth()
   @ApiOperation({
      operationId: 'logoutAll',
      summary: 'Revoke all sessions/tokens for the current user across all devices and clear auth cookies',
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'All user sessions logged out successfully.',
      type: SimpleSuccessResponseDto,
   })
   @ApiErrorResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Unauthorized access or invalid token',
      errorCodes: [COMMON_ERROR_CODES.UNAUTHORIZED, AUTH_ERROR_CODES.TOKEN_INVALID_OR_EXPIRED],
   })
   @ResponseMessage(AUTH_RESPONSE_MESSAGES.LOGOUT_ALL_SUCCESS)
   async logoutAll(
      @CurrentUser() user: JwtPayload,
      @Req() req: Request,
      @Res({ passthrough: true }) res: Response,
   ): Promise<SimpleSuccessResponseDto> {
      const deviceInfo = this.extractDeviceInfo(req);
      if (user?.sub) {
         await this.authService.logoutAll(user.sub, deviceInfo);
      }

      this.clearAuthCookies(res);
      return { success: true, message: AUTH_RESPONSE_MESSAGES.LOGOUT_ALL_SUCCESS };
   }

   @Get('sessions')
   @HttpCode(HttpStatus.OK)
   @ApiCookieAuth()
   @ApiBearerAuth()
   @ApiOperation({
      operationId: 'getUserSessions',
      summary:
         'Get list of all active sessions and logged-in devices for the current user. Supports both cookie and Bearer token authentication.',
   })
   @ApiResponse({
      status: 200,
      description: 'Active sessions and devices retrieved successfully.',
      type: [DeviceSessionResponseDto],
   })
   @ApiErrorResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Unauthorized access or invalid token',
      errorCodes: [COMMON_ERROR_CODES.UNAUTHORIZED, AUTH_ERROR_CODES.TOKEN_INVALID_OR_EXPIRED],
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
      operationId: 'revokeSession',
      summary:
         'Revoke and log out a specific session/device by session ID. Supports both cookie and Bearer token authentication.',
   })
   @ApiParam({ name: 'sessionId', description: 'Session UUID to revoke', type: String })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Session revoked successfully.',
      type: SimpleSuccessResponseDto,
   })
   @ApiErrorResponses([
      {
         status: HttpStatus.UNAUTHORIZED,
         description: 'Unauthorized access or invalid token',
         errorCodes: [COMMON_ERROR_CODES.UNAUTHORIZED, AUTH_ERROR_CODES.TOKEN_INVALID_OR_EXPIRED],
      },
      {
         status: HttpStatus.NOT_FOUND,
         description: 'Session not found or already revoked',
         errorCodes: [AUTH_ERROR_CODES.SESSION_NOT_FOUND, AUTH_ERROR_CODES.SESSION_ALREADY_REVOKED],
         exampleParams: { sessionId: '550e8400-e29b-41d4-a716-446655440000' },
      },
   ])
   @ResponseMessage(AUTH_RESPONSE_MESSAGES.REVOKE_SESSION_SUCCESS)
   async revokeSession(
      @CurrentUser() user: JwtPayload,
      @Param('sessionId') sessionId: string,
      @Req() req: Request,
   ): Promise<SimpleSuccessResponseDto> {
      const deviceInfo = this.extractDeviceInfo(req);
      await this.authService.revokeSession(user.sub, sessionId, deviceInfo);
      return { success: true, message: AUTH_RESPONSE_MESSAGES.REVOKE_SESSION_SUCCESS };
   }

   @Post('sessions/revoke-others')
   @HttpCode(HttpStatus.OK)
   @ApiCookieAuth()
   @ApiBearerAuth()
   @ApiOperation({
      operationId: 'revokeOtherSessions',
      summary:
         'Revoke and log out all other active sessions except the current device session. Supports both cookie and Bearer token authentication.',
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'All other sessions revoked successfully.',
      type: RevokeSessionResultDto,
   })
   @ApiErrorResponses([
      {
         status: HttpStatus.BAD_REQUEST,
         description: 'Current active session ID missing from request',
         errorCodes: [AUTH_ERROR_CODES.CURRENT_SESSION_REQUIRED],
      },
      {
         status: HttpStatus.UNAUTHORIZED,
         description: 'Unauthorized access or invalid token',
         errorCodes: [COMMON_ERROR_CODES.UNAUTHORIZED, AUTH_ERROR_CODES.TOKEN_INVALID_OR_EXPIRED],
      },
   ])
   @ResponseMessage(AUTH_RESPONSE_MESSAGES.REVOKE_OTHER_SESSIONS_SUCCESS)
   async revokeOtherSessions(@CurrentUser() user: JwtPayload, @Req() req: Request): Promise<IRevokeSessionResult> {
      const currentJti = this.extractCurrentJti(req);
      if (!currentJti) {
         throw new BadRequestException(AUTH_ERROR_CODES.CURRENT_SESSION_REQUIRED, {
            params: { reason: AUTH_ERROR_REASONS.REFRESH_TOKEN_MISSING },
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
      operationId: 'initiateChangePassword',
      summary:
         'Initiate password change by validating current password and sending OTP verification code to account email.',
   })
   @ApiResponse({
      status: 200,
      description: 'Current password verified and OTP sent successfully',
      type: ChangePasswordResponseDto,
      links: {
         VerifyChangePasswordOtp: {
            operationId: 'verifyChangePasswordOtp',
            description: 'Verify the OTP code sent to email to finalize password change',
         },
      },
   })
   @ApiErrorResponses([
      {
         status: HttpStatus.BAD_REQUEST,
         description: 'Current password invalid, password unchanged, or OTP cooldown active',
         errorCodes: [
            AUTH_ERROR_CODES.INVALID_OLD_PASSWORD,
            AUTH_ERROR_CODES.PASSWORD_UNCHANGED,
            AUTH_ERROR_CODES.OTP_COOLDOWN_ACTIVE,
            COMMON_ERROR_CODES.VALIDATION_FAILED,
         ],
         exampleParams: { cooldownSeconds: 60 },
      },
      {
         status: HttpStatus.UNAUTHORIZED,
         description: 'User not found or unauthorized',
         errorCodes: [COMMON_ERROR_CODES.UNAUTHORIZED, AUTH_ERROR_CODES.USER_NOT_FOUND],
      },
   ])
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
      operationId: 'verifyChangePasswordOtp',
      summary:
         'Verify OTP code and finalize password change, with automatic session revocation if logoutAll was selected.',
   })
   @ApiResponse({
      status: 200,
      description: 'Password changed successfully via OTP verification',
      type: VerifyChangePasswordOtpResponseDto,
   })
   @ApiErrorResponses([
      {
         status: HttpStatus.BAD_REQUEST,
         description: 'OTP invalid, expired, or maximum attempts exceeded',
         errorCodes: [
            AUTH_ERROR_CODES.OTP_INVALID,
            AUTH_ERROR_CODES.OTP_EXPIRED,
            AUTH_ERROR_CODES.OTP_MAX_ATTEMPTS_EXCEEDED,
         ],
         exampleParams: { remainingAttempts: 1 },
      },
      {
         status: HttpStatus.UNAUTHORIZED,
         description: 'Unauthorized access',
         errorCodes: [COMMON_ERROR_CODES.UNAUTHORIZED],
      },
   ])
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
      operationId: 'getUserSecurityLogs',
      summary:
         'Get security audit logs for the current authenticated user (SOC 2, GDPR user access). Supports both cookie and Bearer token authentication.',
   })
   @ApiResponse({
      status: 200,
      description: 'User security audit logs retrieved successfully',
      type: [AuditLogResponseDto],
   })
   @ApiErrorResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Unauthorized access or invalid token',
      errorCodes: [COMMON_ERROR_CODES.UNAUTHORIZED, AUTH_ERROR_CODES.TOKEN_INVALID_OR_EXPIRED],
   })
   @ResponseMessage(AUTH_RESPONSE_MESSAGES.GET_SECURITY_LOGS_SUCCESS)
   async getSecurityLogs(
      @CurrentUser() user: JwtPayload,
      @Query() query: PaginationQueryDto,
   ): Promise<IAuditLogListResult> {
      return this.authService.getUserAuditLogs(user.sub, query.page, query.limit);
   }

   @Get('me/email')
   @ApiCookieAuth()
   @ApiBearerAuth()
   @ApiOperation({
      operationId: 'getMyEmail',
      summary: 'Get email address of current authenticated user from Auth Service',
      description:
         'Retrieves the account email address and email verification status directly from the Auth Service account database.',
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Account email details retrieved successfully from Auth Service.',
      type: UserEmailResponseDto,
   })
   @ApiErrorResponses([
      {
         status: HttpStatus.UNAUTHORIZED,
         description: 'Authentication token is missing, revoked, or expired.',
         errorCodes: [COMMON_ERROR_CODES.UNAUTHORIZED, AUTH_ERROR_CODES.TOKEN_INVALID_OR_EXPIRED],
      },
      {
         status: HttpStatus.NOT_FOUND,
         description: 'Account record not found in Auth Service.',
         errorCodes: [AUTH_ERROR_CODES.USER_NOT_FOUND],
         exampleParams: { id: '018dc3bc-11a2-7f28-9842-bc08684d0001' },
      },
   ])
   @ResponseMessage(AUTH_RESPONSE_MESSAGES.GET_EMAIL_SUCCESS)
   async getMyEmail(@CurrentAccount('id') accountId: string): Promise<UserEmailResponseDto> {
      return this.authService.getEmail(accountId);
   }

   @Get('me')
   @ApiCookieAuth()
   @ApiBearerAuth()
   @ApiOperation({
      operationId: 'getAuthProfile',
      summary: 'Get current authenticated user profile. Supports both cookie and Bearer token authentication.',
   })
   @ApiResponse({
      status: HttpStatus.OK,
      description: 'Current user profile returned.',
      type: AuthProfileResponseDto,
   })
   @ApiErrorResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Unauthorized if authentication is missing or invalid.',
      errorCodes: [COMMON_ERROR_CODES.UNAUTHORIZED, AUTH_ERROR_CODES.TOKEN_INVALID_OR_EXPIRED],
   })
   @ResponseMessage(AUTH_RESPONSE_MESSAGES.GET_PROFILE_SUCCESS)
   getProfile(@CurrentUser() user: JwtPayload): AuthProfileResponseDto {
      return user;
   }
}
