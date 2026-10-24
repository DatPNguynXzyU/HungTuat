import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SharedEnvConfig } from '@common/config/shared-env.schema';
import {
   DEFAULT_DEV_EC_PRIVATE_KEY,
   DEFAULT_DEV_EC_PUBLIC_KEY,
   DEFAULT_JWT_ALGORITHM,
   DEFAULT_JWT_AUDIENCE,
   DEFAULT_JWT_ISSUER,
   DEFAULT_JWT_KEY_ID,
} from '@common/constants/jwt.constant';
import { isDevelopment, isProduction, isTest, type NodeEnvValue } from '@common/constants/environment.constant';
import { ENV_KEYS } from '@common/constants/env-keys.constant';
import { JwtUtil } from '@common/utils/jwt.util';

@Injectable()
export class CommonConfigService {
   private _cachedJwtPublicKey?: string;
   private _cachedJwtPrivateKey?: string;

   constructor(protected readonly configService: ConfigService<SharedEnvConfig, true>) {}

   clearKeyCache(): void {
      this._cachedJwtPublicKey = undefined;
      this._cachedJwtPrivateKey = undefined;
   }

   get nodeEnv(): NodeEnvValue {
      return this.configService.get(ENV_KEYS.NODE_ENV, { infer: true });
   }

   get isProduction(): boolean {
      return isProduction(this.nodeEnv);
   }

   get isDevelopment(): boolean {
      return isDevelopment(this.nodeEnv);
   }

   get isTest(): boolean {
      return isTest(this.nodeEnv);
   }

   get serviceName(): string {
      return this.configService.get(ENV_KEYS.SERVICE_NAME, { infer: true });
   }

   get logLevel(): string {
      return this.configService.get(ENV_KEYS.LOG_LEVEL, { infer: true });
   }

   get otelEnabled(): boolean {
      return this.configService.get(ENV_KEYS.OTEL_ENABLED, { infer: true });
   }

   get otelExporterOtlpEndpoint(): string {
      return this.configService.get(ENV_KEYS.OTEL_EXPORTER_OTLP_ENDPOINT, { infer: true });
   }

   get jwtPublicKeyPath(): string | undefined {
      return this.configService.get(ENV_KEYS.JWT_PUBLIC_KEY_PATH, { infer: true });
   }

   get jwtPrivateKeyPath(): string | undefined {
      return this.configService.get(ENV_KEYS.JWT_PRIVATE_KEY_PATH, { infer: true });
   }

   get jwtPublicKey(): string {
      if (this._cachedJwtPublicKey !== undefined) {
         return this._cachedJwtPublicKey;
      }
      const fromFile = this.jwtPublicKeyPath ? JwtUtil.readKeyFile(this.jwtPublicKeyPath) : null;
      let key = fromFile;
      if (!key) {
         const rawKey = this.configService.get(ENV_KEYS.JWT_PUBLIC_KEY, { infer: true });
         key = rawKey ? JwtUtil.formatPemKey(rawKey) : '';
      }
      if (!key) {
         if (this.isProduction) {
            throw new Error('FATAL: JWT public key missing in production');
         }
         key = DEFAULT_DEV_EC_PUBLIC_KEY;
      }
      this._cachedJwtPublicKey = key;
      return key;
   }

   get jwtPrivateKey(): string {
      if (this._cachedJwtPrivateKey !== undefined) {
         return this._cachedJwtPrivateKey;
      }
      const fromFile = this.jwtPrivateKeyPath ? JwtUtil.readKeyFile(this.jwtPrivateKeyPath) : null;
      let key = fromFile;
      if (!key) {
         const rawKey = this.configService.get(ENV_KEYS.JWT_PRIVATE_KEY, { infer: true });
         key = rawKey ? JwtUtil.formatPemKey(rawKey) : '';
      }
      if (!key) {
         if (this.isProduction) {
            throw new Error('FATAL: JWT private key missing in production');
         }
         key = DEFAULT_DEV_EC_PRIVATE_KEY;
      }

      this._cachedJwtPrivateKey = key;
      return key;
   }

   get jwtKeyId(): string {
      return this.configService.get(ENV_KEYS.JWT_KEY_ID, { infer: true }) || DEFAULT_JWT_KEY_ID;
   }

   get jwtAlgorithm(): string {
      return this.configService.get(ENV_KEYS.JWT_ALGORITHM, { infer: true }) || DEFAULT_JWT_ALGORITHM;
   }

   get jwtIssuer(): string {
      return this.configService.get(ENV_KEYS.JWT_ISSUER, { infer: true }) || DEFAULT_JWT_ISSUER;
   }

   get jwtAudience(): string {
      return this.configService.get(ENV_KEYS.JWT_AUDIENCE, { infer: true }) || DEFAULT_JWT_AUDIENCE;
   }

   get jwtSecret(): string {
      return this.jwtPublicKey;
   }

   get jwtRefreshSecret(): string {
      return this.jwtPublicKey;
   }

   get jwtAccessTokenExpiresIn(): number {
      return (
         this.configService.get(ENV_KEYS.JWT_ACCESS_TOKEN_EXPIRES_IN, { infer: true }) ||
         this.configService.get(ENV_KEYS.JWT_EXPIRES_IN, { infer: true }) ||
         900
      );
   }

   get jwtRefreshTokenExpiresIn(): number {
      return this.configService.get(ENV_KEYS.JWT_REFRESH_TOKEN_EXPIRES_IN, { infer: true }) || 604800;
   }

   get accessTokenCookieName(): string {
      return this.configService.get(ENV_KEYS.COOKIE_ACCESS_TOKEN_NAME, { infer: true }) || 'access_token';
   }

   get cookieName(): string {
      return this.accessTokenCookieName;
   }

   get refreshTokenCookieName(): string {
      return this.configService.get(ENV_KEYS.COOKIE_REFRESH_TOKEN_NAME, { infer: true }) || 'refresh_token';
   }

   get accessTokenCookieMaxAge(): number {
      return (
         this.configService.get(ENV_KEYS.COOKIE_ACCESS_TOKEN_MAX_AGE, { infer: true }) ||
         this.jwtAccessTokenExpiresIn * 1000
      );
   }

   get refreshTokenCookieMaxAge(): number {
      return (
         this.configService.get(ENV_KEYS.COOKIE_REFRESH_TOKEN_MAX_AGE, { infer: true }) ||
         this.jwtRefreshTokenExpiresIn * 1000
      );
   }

   get redis() {
      return {
         host: this.configService.get(ENV_KEYS.REDIS_HOST, { infer: true }),
         port: this.configService.get(ENV_KEYS.REDIS_PORT, { infer: true }),
         password: this.configService.get(ENV_KEYS.REDIS_PASSWORD, { infer: true }),
      };
   }

   get rabbitMq() {
      const uri =
         this.configService.get(ENV_KEYS.RABBIT_MQ_URI, { infer: true }) ||
         this.configService.get(ENV_KEYS.RABBITMQ_URI, { infer: true }) ||
         'amqp://guest:guest@localhost:5672';

      return {
         uri,
         authQueue: this.configService.get(ENV_KEYS.RABBIT_MQ_AUTH_SERVICE_QUEUE, { infer: true }),
         userQueue: this.configService.get(ENV_KEYS.RABBIT_MQ_USER_SERVICE_QUEUE, { infer: true }),
         orderQueue: this.configService.get(ENV_KEYS.RABBIT_MQ_ORDER_SERVICE_QUEUE, { infer: true }),
         notificationQueue: this.configService.get(ENV_KEYS.RABBIT_MQ_NOTIFICATION_SERVICE_QUEUE, { infer: true }),
         getQueue: (serviceName: string): string => {
            const dynamicKey = `RABBIT_MQ_${serviceName}_QUEUE` as keyof SharedEnvConfig;
            const configuredQueue = this.configService.get(dynamicKey, { infer: true });
            return typeof configuredQueue === 'string' && configuredQueue
               ? configuredQueue
               : `${serviceName.toLowerCase()}_queue`;
         },
      };
   }
}
