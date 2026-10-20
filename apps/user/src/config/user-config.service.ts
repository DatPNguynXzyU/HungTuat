import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommonConfigService, ENV_KEYS } from '@common';
import { UserEnvConfig, USER_ENV_KEYS } from '@user/config/user-env.schema';

@Injectable()
export class UserConfigService extends CommonConfigService {
   constructor(protected override readonly configService: ConfigService<UserEnvConfig, true>) {
      super(configService);
   }

   get databaseUrl(): string {
      return this.configService.get(ENV_KEYS.DATABASE_URL, { infer: true });
   }

   get port(): number {
      return this.configService.get(USER_ENV_KEYS.PORT, { infer: true });
   }

   get grpcPort(): number {
      return this.configService.get(USER_ENV_KEYS.GRPC_PORT, { infer: true });
   }

   get grpcUrl(): string {
      return `0.0.0.0:${this.grpcPort}`;
   }

   get database() {
      return {
         url: this.databaseUrl,
      };
   }

   get nebula() {
      return {
         graphAddress: this.configService.get(USER_ENV_KEYS.NEBULA_GRAPHD_HOST, { infer: true }) || '127.0.0.1',
         graphPort: Number(this.configService.get(USER_ENV_KEYS.NEBULA_GRAPHD_PORT, { infer: true }) || 9669),
         username: this.configService.get(USER_ENV_KEYS.NEBULA_USERNAME, { infer: true }) || 'root',
         password: this.configService.get(USER_ENV_KEYS.NEBULA_PASSWORD, { infer: true }) || 'nebula',
         space: this.configService.get(USER_ENV_KEYS.NEBULA_SPACE, { infer: true }) || 'social_graph',
      };
   }
}
