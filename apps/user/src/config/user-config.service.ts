import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommonConfigService } from '@common';
import { UserEnvConfig } from '@user/config/user-env.schema';

@Injectable()
export class UserConfigService extends CommonConfigService {
   constructor(protected override readonly configService: ConfigService<UserEnvConfig, true>) {
      super(configService);
   }

   get databaseUrl(): string {
      return this.configService.get('DATABASE_URL', { infer: true });
   }

   get database() {
      return {
         url: this.databaseUrl,
      };
   }
}
