import { Injectable } from '@nestjs/common';
import type { SignOptions, VerifyOptions } from 'jsonwebtoken';
import { DEFAULT_DEV_RSA_PUBLIC_KEY, type JwtPayload, JwtUtil } from '@common';
import { type IJwksResponse } from '@contracts/auth';
import { AuthConfigService } from '@auth/config';
import type { IJwtService } from './token.service.interface';

@Injectable()
export class JwtService implements IJwtService {
   private readonly jwtPrivateKey: string;
   private readonly jwtPublicKey: string;
   private readonly jwtKeyId: string;
   private readonly _accessTokenExpiresIn: number;
   private readonly _refreshTokenExpiresIn: number;

   constructor(private readonly config: AuthConfigService) {
      this.jwtPrivateKey = this.config.jwtPrivateKey;
      this.jwtPublicKey = this.config.jwtPublicKey || DEFAULT_DEV_RSA_PUBLIC_KEY;
      this.jwtKeyId = this.config.jwtKeyId;
      this._accessTokenExpiresIn = this.config.jwtAccessTokenExpiresIn;
      this._refreshTokenExpiresIn = this.config.jwtRefreshTokenExpiresIn;
   }

   get publicKey(): string {
      return this.jwtPublicKey;
   }

   get privateKey(): string {
      return this.jwtPrivateKey;
   }

   get keyId(): string {
      return this.jwtKeyId;
   }

   get accessTokenExpiresIn(): number {
      return this._accessTokenExpiresIn;
   }

   get refreshTokenExpiresIn(): number {
      return this._refreshTokenExpiresIn;
   }

   sign(payload: Omit<JwtPayload, 'iat' | 'exp'> | JwtPayload, options?: SignOptions): string;
   sign(
      payload: Omit<JwtPayload, 'iat' | 'exp'> | JwtPayload,
      expiresInSeconds?: number,
      options?: Omit<SignOptions, 'expiresIn'>,
   ): string;
   sign(
      payload: Omit<JwtPayload, 'iat' | 'exp'> | JwtPayload,
      optionsOrExpiresIn?: SignOptions | number,
      extraOptions?: Omit<SignOptions, 'expiresIn'>,
   ): string {
      let expiresInSeconds = this._accessTokenExpiresIn;
      let signOptions: SignOptions = { keyid: this.jwtKeyId };

      if (typeof optionsOrExpiresIn === 'number') {
         expiresInSeconds = optionsOrExpiresIn;
         if (extraOptions) {
            signOptions = { ...signOptions, ...extraOptions };
         }
      } else if (typeof optionsOrExpiresIn === 'object' && optionsOrExpiresIn !== null) {
         signOptions = { ...signOptions, ...optionsOrExpiresIn };
         if (typeof optionsOrExpiresIn.expiresIn === 'number') {
            expiresInSeconds = optionsOrExpiresIn.expiresIn;
         }
      }

      return JwtUtil.sign(payload, this.jwtPrivateKey, expiresInSeconds, signOptions);
   }

   verify(token: string, options?: VerifyOptions): JwtPayload {
      return JwtUtil.verify(token, this.jwtPublicKey, options);
   }

   getJwks(): IJwksResponse {
      return JwtUtil.generateJwks(this.jwtPublicKey, this.jwtKeyId);
   }
}
