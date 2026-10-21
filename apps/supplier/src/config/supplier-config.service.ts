import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ENV_KEYS } from '@common';
import { SUPPLIER_ENV_KEYS, type SupplierEnvConfig } from '@supplier/config/supplier-env.schema';

@Injectable()
export class SupplierConfigService {
   constructor(private readonly configService: ConfigService<SupplierEnvConfig, true>) {}

   get nodeEnv(): string {
      return this.configService.get(ENV_KEYS.NODE_ENV, { infer: true });
   }

   get isProduction(): boolean {
      return this.nodeEnv === 'production';
   }

   get isDevelopment(): boolean {
      return this.nodeEnv === 'development';
   }

   get serviceName(): string {
      return this.configService.get(ENV_KEYS.SERVICE_NAME, { infer: true });
   }

   get port(): number {
      return this.configService.get(SUPPLIER_ENV_KEYS.PORT, { infer: true });
   }

   get grpcPort(): number {
      return this.configService.get(SUPPLIER_ENV_KEYS.GRPC_PORT, { infer: true });
   }

   get grpcUrl(): string {
      return `0.0.0.0:${this.grpcPort}`;
   }

   get databaseUrl(): string {
      return this.configService.get(SUPPLIER_ENV_KEYS.DATABASE_URL, { infer: true });
   }

   get rabbitmqUri(): string {
      return this.configService.get(ENV_KEYS.RABBITMQ_URI, { infer: true });
   }
}
