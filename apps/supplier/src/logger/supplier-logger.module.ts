import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { AppLogger } from '@common';
import { SupplierConfigModule, SupplierConfigService } from '@supplier/config';

@Module({
   imports: [
      LoggerModule.forRootAsync({
         imports: [SupplierConfigModule],
         inject: [SupplierConfigService],
         useFactory: (config: SupplierConfigService) => ({
            pinoHttp: {
               level: config.isProduction ? 'info' : 'debug',
               transport: config.isProduction
                  ? undefined
                  : {
                       target: 'pino-pretty',
                       options: {
                          colorize: true,
                          singleLine: true,
                       },
                    },
            },
         }),
      }),
   ],
   providers: [AppLogger],
   exports: [AppLogger],
})
export class SupplierLoggerModule {}
