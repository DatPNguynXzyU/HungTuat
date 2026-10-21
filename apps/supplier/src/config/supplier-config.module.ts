import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupplierConfigService } from '@supplier/config/supplier-config.service';
import { validateSupplierEnv } from '@supplier/config/supplier-env.schema';

@Global()
@Module({
   imports: [
      ConfigModule.forRoot({
         isGlobal: true,
         validate: validateSupplierEnv,
      }),
   ],
   providers: [SupplierConfigService],
   exports: [SupplierConfigService],
})
export class SupplierConfigModule {}
