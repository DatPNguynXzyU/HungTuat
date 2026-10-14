import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateSharedEnv } from '@common/config/shared-env.schema';
import { CommonConfigService } from '@common/config/common-config.service';

@Global()
@Module({
   imports: [
      ConfigModule.forRoot({
         isGlobal: true,
         validate: validateSharedEnv,
         envFilePath: [process.env.ENV_FILE || '', '.env.local', '.env'].filter(Boolean),
      }),
   ],
   providers: [CommonConfigService],
   exports: [CommonConfigService, ConfigModule],
})
export class CommonConfigModule {}
