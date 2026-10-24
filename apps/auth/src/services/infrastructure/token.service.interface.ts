import type { IDeviceInfo, JwtPayload } from '@common';
import type { IJwksResponse } from '@contracts/auth';
import type { SignOptions, VerifyOptions } from 'jsonwebtoken';

export interface TokenPair {
   accessToken: string;
   refreshToken: string;
}

export interface ITokenAccountPayload {
   accountId: string;
   email: string;
   roles: string[];
}

export const JWT_SERVICE = Symbol('JWT_SERVICE');

export interface IJwtService {
   readonly publicKey: string;
   readonly privateKey: string;
   readonly keyId: string;
   readonly accessTokenExpiresIn: number;
   readonly refreshTokenExpiresIn: number;

   sign(payload: Omit<JwtPayload, 'iat' | 'exp'> | JwtPayload, options?: SignOptions): string;
   sign(
      payload: Omit<JwtPayload, 'iat' | 'exp'> | JwtPayload,
      expiresInSeconds?: number,
      options?: Omit<SignOptions, 'expiresIn'>,
   ): string;
   verify(token: string, options?: VerifyOptions): JwtPayload;
   getJwks(): IJwksResponse;
}

export const VERIFICATION_TOKEN_SERVICE = Symbol('VERIFICATION_TOKEN_SERVICE');

export interface IVerificationTokenService {
   generate(email: string, ttl?: number): Promise<string>;
   validate(token: string): Promise<string | null>;
   consume(token: string): Promise<string | null>;
   generateVerificationToken?(email: string, ttl?: number): Promise<string>;
   validateVerificationToken?(token: string): Promise<string | null>;
   consumeVerificationToken?(token: string): Promise<string | null>;
}

export const TOKEN_LIFECYCLE_SERVICE = Symbol('TOKEN_LIFECYCLE_SERVICE');

export interface ITokenLifecycleService {
   generateTokenPair(account: ITokenAccountPayload, deviceInfo?: IDeviceInfo): Promise<TokenPair>;
   rotateTokenPair(
      account: ITokenAccountPayload,
      oldRefreshTokenJti: string,
      deviceInfo?: IDeviceInfo,
      remainingTtl?: number,
   ): Promise<TokenPair>;
   validateAccessToken(token: string): Promise<JwtPayload>;
   validateRefreshToken(token: string): Promise<JwtPayload>;
   isTokenRevoked(jti: string): Promise<boolean>;
   invalidateRefreshToken(accountId: string, jti: string, remainingTtl?: number): Promise<void>;
   revokeAllAccountTokens(accountId: string): Promise<void>;
   logoutAll(accountId: string): Promise<void>;
   revokeToken(token: string): Promise<void>;
}
