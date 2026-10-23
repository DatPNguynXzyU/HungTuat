import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { createGrpcRetryChannelOptions } from '@common';
import {
   USER_V1_GRPC_CLIENT,
   USER_V1_GRPC_PACKAGE_NAME,
   getUserProtoLoaderOptions,
   getUserProtoPath,
} from '@contracts/user';
import { HEALTH_GRPC_PACKAGE_NAME, getHealthProtoPath } from '@contracts/health';
import { GatewayConfigModule, GatewayConfigService } from '@/config';
import { UsersController } from '@/modules/users/users.controller';
import { UsersService } from '@/modules/users/users.service';

@Module({
   imports: [
      ClientsModule.registerAsync([
         {
            name: USER_V1_GRPC_CLIENT,
            imports: [GatewayConfigModule],
            inject: [GatewayConfigService],
            useFactory: (configService: GatewayConfigService) => ({
               transport: Transport.GRPC,
               options: {
                  package: [USER_V1_GRPC_PACKAGE_NAME, HEALTH_GRPC_PACKAGE_NAME],
                  protoPath: [getUserProtoPath(), getHealthProtoPath()],
                  url: configService.userGrpcUrl,
                  loader: getUserProtoLoaderOptions(),
                  channelOptions: createGrpcRetryChannelOptions({
                     serviceNames: [USER_V1_GRPC_PACKAGE_NAME],
                  }),
               },
            }),
         },
      ]),
   ],
   controllers: [UsersController],
   providers: [UsersService],
   exports: [UsersService],
})
export class UsersModule {}
