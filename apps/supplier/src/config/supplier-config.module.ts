import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonConfigService } from '@common';
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
   providers: [
      SupplierConfigService,
      {
         provide: CommonConfigService,
         useExisting: SupplierConfigService,
      },
   ],
   exports: [SupplierConfigService, CommonConfigService],
})
export class SupplierConfigModule {}
