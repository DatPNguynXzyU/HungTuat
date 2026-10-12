import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommonConfigService, ENV_KEYS } from '@common';
import { UserEnvConfig } from '@user/core/config/user-env.schema';

@Injectable()
export class UserConfigService extends CommonConfigService {
   constructor(protected override readonly configService: ConfigService<UserEnvConfig, true>) {
      super(configService);
   }

   get databaseUrl(): string {
      return this.configService.get(ENV_KEYS.DATABASE_URL, { infer: true });
   }

   get database() {
      return {
         url: this.databaseUrl,
      };
   }
}
