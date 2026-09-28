import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions } from 'express';
import { CommonConfigService } from '@common';
import { GatewayEnvConfig } from '@/config/gateway-env.schema';

@Injectable()
export class GatewayConfigService extends CommonConfigService {
   constructor(protected override readonly configService: ConfigService<GatewayEnvConfig, true>) {
      super(configService);
   }

   get port(): number {
      return this.configService.get('PORT', { infer: true });
   }

   get globalPrefix(): string {
      return this.configService.get('GLOBAL_PREFIX', { infer: true });
   }

   override get jwtPublicKeyPath(): string {
      return this.configService.get('JWT_PUBLIC_KEY_PATH', { infer: true }) || 'apps/gateway/keys/public.key';
   }

   get corsOrigins(): string[] {
      const raw = this.configService.get('CORS_ORIGINS', { infer: true });
      if (!raw) {
         return [];
      }
      return raw
         .split(',')
         .map((origin) => origin.trim())
         .filter(Boolean);
   }

   get cookieMaxAge(): number {
      return this.accessTokenCookieMaxAge;
   }

   get accessTokenCookieOptions(): CookieOptions {
      return {
         httpOnly: true,
         secure: this.isProduction,
         sameSite: this.isProduction ? 'strict' : 'lax',
         path: '/',
         maxAge: this.accessTokenCookieMaxAge,
      };
   }

   get refreshTokenCookieOptions(): CookieOptions {
      return {
         httpOnly: true,
         secure: this.isProduction,
         sameSite: this.isProduction ? 'strict' : 'lax',
         path: '/',
         maxAge: this.refreshTokenCookieMaxAge,
      };
   }

   get cookieOptions(): CookieOptions {
      return this.accessTokenCookieOptions;
   }

   get clearCookieOptions(): CookieOptions {
      return {
         httpOnly: true,
         secure: this.isProduction,
         sameSite: this.isProduction ? 'strict' : 'lax',
         path: '/',
      };
   }

   get throttle() {
      return {
         shortTtl: this.configService.get('THROTTLE_SHORT_TTL', { infer: true }),
         shortLimit: this.configService.get('THROTTLE_SHORT_LIMIT', { infer: true }),
         mediumTtl: this.configService.get('THROTTLE_MEDIUM_TTL', { infer: true }),
         mediumLimit: this.configService.get('THROTTLE_MEDIUM_LIMIT', { infer: true }),
         longTtl: this.configService.get('THROTTLE_LONG_TTL', { infer: true }),
         longLimit: this.configService.get('THROTTLE_LONG_LIMIT', { infer: true }),
      };
   }
}
