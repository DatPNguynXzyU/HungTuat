import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SharedEnvConfig } from '@common/config/shared-env.schema';

@Injectable()
export class CommonConfigService {
   constructor(protected readonly configService: ConfigService<SharedEnvConfig, true>) {}

   get nodeEnv(): 'development' | 'production' | 'test' {
      return this.configService.get('NODE_ENV', { infer: true });
   }

   get isProduction(): boolean {
      return this.nodeEnv === 'production';
   }

   get isDevelopment(): boolean {
      return this.nodeEnv === 'development';
   }

   get isTest(): boolean {
      return this.nodeEnv === 'test';
   }

   get serviceName(): string {
      return this.configService.get('SERVICE_NAME', { infer: true });
   }

   get logLevel(): string {
      return this.configService.get('LOG_LEVEL', { infer: true });
   }

   get jwtSecret(): string {
      return this.configService.get('JWT_SECRET', { infer: true });
   }

   get jwtRefreshSecret(): string {
      return this.configService.get('JWT_REFRESH_SECRET', { infer: true }) || this.jwtSecret;
   }

   get jwtAccessTokenExpiresIn(): number {
      return (
         this.configService.get('JWT_ACCESS_TOKEN_EXPIRES_IN', { infer: true }) ||
         this.configService.get('JWT_EXPIRES_IN', { infer: true }) ||
         900
      );
   }

   get jwtRefreshTokenExpiresIn(): number {
      return this.configService.get('JWT_REFRESH_TOKEN_EXPIRES_IN', { infer: true }) || 604800;
   }

   get cookieName(): string {
      return this.configService.get('COOKIE_NAME', { infer: true });
   }

   get accessTokenCookieMaxAge(): number {
      return (
         this.configService.get('COOKIE_ACCESS_TOKEN_MAX_AGE', { infer: true }) || this.jwtAccessTokenExpiresIn * 1000
      );
   }

   get refreshTokenCookieMaxAge(): number {
      return (
         this.configService.get('COOKIE_REFRESH_TOKEN_MAX_AGE', { infer: true }) || this.jwtRefreshTokenExpiresIn * 1000
      );
   }

   get redis() {
      return {
         host: this.configService.get('REDIS_HOST', { infer: true }),
         port: this.configService.get('REDIS_PORT', { infer: true }),
         password: this.configService.get('REDIS_PASSWORD', { infer: true }),
      };
   }

   get rabbitMq() {
      const uri =
         this.configService.get('RABBIT_MQ_URI', { infer: true }) ||
         this.configService.get('RABBITMQ_URI', { infer: true }) ||
         'amqp://guest:guest@localhost:5672';

      return {
         uri,
         authQueue: this.configService.get('RABBIT_MQ_AUTH_SERVICE_QUEUE', { infer: true }),
         userQueue: this.configService.get('RABBIT_MQ_USER_SERVICE_QUEUE', { infer: true }),
         orderQueue: this.configService.get('RABBIT_MQ_ORDER_SERVICE_QUEUE', { infer: true }),
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
