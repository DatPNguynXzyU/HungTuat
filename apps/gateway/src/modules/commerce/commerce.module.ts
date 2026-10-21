import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { createGrpcRetryChannelOptions, RmqModule, SERVICES } from '@common';
import {
   COMMERCE_V1_GRPC_CLIENT,
   COMMERCE_V1_GRPC_PACKAGE_NAME,
   getCommerceProtoLoaderOptions,
   getCommerceProtoPath,
} from '@contracts/commerce';
import { HEALTH_GRPC_PACKAGE_NAME, getHealthProtoPath } from '@contracts/health';
import { GatewayConfigModule, GatewayConfigService } from '@/config';
import { CommerceController } from '@/modules/commerce/commerce.controller';
import { CommerceService } from '@/modules/commerce/commerce.service';

@Module({
   imports: [
      RmqModule.register({
         name: SERVICES.COMMERCE_SERVICE,
      }),
      RmqModule.register({
         name: SERVICES.SEARCH_SERVICE,
      }),
      ClientsModule.registerAsync([
         {
            name: COMMERCE_V1_GRPC_CLIENT,
            imports: [GatewayConfigModule],
            inject: [GatewayConfigService],
            useFactory: (configService: GatewayConfigService) => ({
               transport: Transport.GRPC,
               options: {
                  package: [COMMERCE_V1_GRPC_PACKAGE_NAME, HEALTH_GRPC_PACKAGE_NAME],
                  protoPath: [getCommerceProtoPath(), getHealthProtoPath()],
                  url: configService.commerceGrpcUrl,
                  loader: getCommerceProtoLoaderOptions(),
                  channelOptions: createGrpcRetryChannelOptions({
                     serviceNames: [COMMERCE_V1_GRPC_PACKAGE_NAME],
                  }),
               },
            }),
         },
      ]),
   ],
   controllers: [CommerceController],
   providers: [CommerceService],
   exports: [CommerceService],
})
export class CommerceModule {}
