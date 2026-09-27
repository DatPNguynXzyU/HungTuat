import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import {
   AUTH_COOKIES,
   CurrentUser,
   LoginDto,
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

   private setAuthCookies(res: Response, tokens: { accessToken: string; refreshToken: string }): void {
      res.cookie(AUTH_COOKIES.ACCESS_TOKEN, tokens.accessToken, this.config.accessTokenCookieOptions);
      res.cookie(AUTH_COOKIES.REFRESH_TOKEN, tokens.refreshToken, this.config.refreshTokenCookieOptions);
   }

   private clearAuthCookies(res: Response): void {
      res.clearCookie(AUTH_COOKIES.ACCESS_TOKEN, this.config.clearCookieOptions);
      res.clearCookie(AUTH_COOKIES.REFRESH_TOKEN, this.config.clearCookieOptions);
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
      @Body() registerDto: RegisterDto,
      @Res({ passthrough: true }) res: Response,
   ): Promise<{ user: unknown }> {
      const result = await this.authService.register(registerDto);

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
   async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response): Promise<{ user: unknown }> {
      const result = await this.authService.login(loginDto);

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

      const result = await this.authService.refreshToken(token);

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

      if (token) {
         await this.authService.revokeToken(token);
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

      if (refreshToken) {
         await this.authService.revokeToken(refreshToken);
      }

      this.clearAuthCookies(res);

      return {
         message: 'Logged out successfully',
      };
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
