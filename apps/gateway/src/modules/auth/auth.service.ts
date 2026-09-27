import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
   AUTH_PATTERNS,
   IAuthResult,
   IRevokeTokenResult,
   IValidateTokenResult,
   LoginDto,
   RegisterDto,
   SERVICES,
} from '@common';
import { firstValueFrom } from 'rxjs';

export type AuthResponseData = IAuthResult;
export type ValidateTokenResponse = IValidateTokenResult;
export type RevokeTokenResponse = IRevokeTokenResult;

@Injectable()
export class AuthService {
   constructor(@Inject(SERVICES.AUTH_SERVICE) private readonly authClient: ClientProxy) {}

   async register(registerDto: RegisterDto): Promise<IAuthResult> {
      return firstValueFrom(
         this.authClient.send<IAuthResult, RegisterDto>({ cmd: AUTH_PATTERNS.REGISTER }, registerDto),
      );
   }

   async login(loginDto: LoginDto): Promise<IAuthResult> {
      return firstValueFrom(this.authClient.send<IAuthResult, LoginDto>({ cmd: AUTH_PATTERNS.LOGIN }, loginDto));
   }

   async refreshToken(refreshToken: string): Promise<IAuthResult> {
      return firstValueFrom(
         this.authClient.send<IAuthResult, { refreshToken: string }>(
            { cmd: AUTH_PATTERNS.REFRESH_TOKEN },
            { refreshToken },
         ),
      );
   }

   async revokeToken(token: string): Promise<IRevokeTokenResult> {
      return firstValueFrom(
         this.authClient.send<IRevokeTokenResult, { token: string }>({ cmd: AUTH_PATTERNS.REVOKE_TOKEN }, { token }),
      );
   }

   async validateToken(token: string): Promise<IValidateTokenResult> {
      return firstValueFrom(
         this.authClient.send<IValidateTokenResult, { token: string }>(
            { cmd: AUTH_PATTERNS.VALIDATE_TOKEN },
            { token },
         ),
      );
   }
}
