import { DynamicModule, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AppConfigModule, AppConfigService } from '@common/config';
import { RmqService } from '@common/rmq/rmq.service';

interface RmqModuleOptions {
   name: string;
}

@Module({
   imports: [AppConfigModule],
   providers: [RmqService],
   exports: [RmqService],
})
export class RmqModule {
   static register({ name }: RmqModuleOptions): DynamicModule {
      return {
         module: RmqModule,
         imports: [
            ClientsModule.registerAsync([
               {
                  name,
                  imports: [AppConfigModule],
                  useFactory: (config: AppConfigService) => {
                     const urls = [config.rabbitMq.uri];
                     const queue = config.rabbitMq.getQueue(name);

                     return {
                        transport: Transport.RMQ,
                        options: {
                           urls,
                           queue,
                           persistent: true,
                           queueOptions: {
                              durable: true,
                           },
                        },
                     };
                  },
                  inject: [AppConfigService],
               },
            ]),
         ],
         exports: [ClientsModule],
      };
   }
}
