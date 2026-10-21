import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommerceConfigService } from '@commerce/config/commerce-config.service';
import { validateCommerceEnv } from '@commerce/config/commerce-env.schema';

@Global()
@Module({
   imports: [
      ConfigModule.forRoot({
         isGlobal: true,
         validate: validateCommerceEnv,
      }),
   ],
   providers: [CommerceConfigService],
   exports: [CommerceConfigService],
})
export class CommerceConfigModule {}
