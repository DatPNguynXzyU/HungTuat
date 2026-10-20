import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { createGrpcRetryChannelOptions, RmqModule, SERVICES } from '@common';
import { USER_V1_GRPC_CLIENT, USER_V1_GRPC_PACKAGE_NAME, getUserProtoPath } from '@contracts/user';
import { HEALTH_GRPC_PACKAGE_NAME, getHealthProtoPath } from '@contracts/health';
import { GatewayConfigModule, GatewayConfigService } from '@/config';
import { UsersController } from '@/modules/users/users.controller';
import { UsersService } from '@/modules/users/users.service';

@Module({
   imports: [
      RmqModule.register({
         name: SERVICES.USER_SERVICE,
      }),
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
