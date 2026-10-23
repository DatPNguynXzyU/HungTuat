import { Inject, Injectable } from '@nestjs/common';
import type { IDeviceInfo } from '@common';
import type { LoginDto, UserEmailResponseDto, IAuthResult, IValidateTokenResult, IJwksResponse } from '@contracts/auth';
import { JWT_SERVICE, type IJwtService } from '@auth/services/infrastructure';
import { AuthLoginService } from '@auth/services/domain/auth-login.service';
import { AuthTokenService } from '@auth/services/domain/auth-token.service';
import { AuthRbacService } from '@auth/services/domain/auth-rbac.service';
import { AuthAccountService } from '@auth/services/domain/auth-account.service';

/**
 * AuthCoreService acts as a Facade coordinating domain services:
 * - AuthLoginService: Authentication & login flow orchestration
 * - AuthTokenService: Token rotation, revocation, logout-all, and validation
 * - AuthRbacService: RBAC role querying and caching
 * - AuthAccountService: Account data retrieval
 * - JwtService: Cryptographic key and JWKS operations
 */
@Injectable()
export class AuthCoreService {
   constructor(
      private readonly authLoginService: AuthLoginService,
      private readonly authTokenService: AuthTokenService,
      private readonly authRbacService: AuthRbacService,
      private readonly authAccountService: AuthAccountService,
      @Inject(JWT_SERVICE)
      private readonly jwtService: IJwtService,
   ) {}

   getJwks(): IJwksResponse {
      return this.jwtService.getJwks();
   }

   async getRolePermissions(roleCode: string): Promise<string[]> {
      return this.authRbacService.getRolePermissions(roleCode);
   }

   async login(dto: LoginDto, deviceInfo?: IDeviceInfo): Promise<IAuthResult> {
      return this.authLoginService.login(dto, deviceInfo);
   }

   async refreshToken(token: string, deviceInfo?: IDeviceInfo): Promise<IAuthResult> {
      return this.authTokenService.refreshToken(token, deviceInfo);
   }

   async revokeToken(token: string, deviceInfo?: IDeviceInfo): Promise<void> {
      return this.authTokenService.revokeToken(token, deviceInfo);
   }

   async revokeAllAccountTokens(accountId: string, deviceInfo?: IDeviceInfo): Promise<void> {
      return this.authTokenService.revokeAllAccountTokens(accountId, deviceInfo);
   }

   async logoutAll(accountId: string, deviceInfo?: IDeviceInfo): Promise<void> {
      return this.authTokenService.logoutAll(accountId, deviceInfo);
   }

   async validateToken(token: string): Promise<IValidateTokenResult> {
      return this.authTokenService.validateToken(token);
   }

   async getEmail(accountId: string): Promise<UserEmailResponseDto> {
      return this.authAccountService.getEmail(accountId);
   }

   async registerServicePermissions(
      serviceName: string,
      permissions: Array<{ code: string; name: string; description?: string }>,
   ): Promise<number> {
      return this.authRbacService.registerServicePermissions(serviceName, permissions);
   }
}
