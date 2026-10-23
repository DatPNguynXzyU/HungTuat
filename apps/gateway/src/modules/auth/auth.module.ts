import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { createGrpcRetryChannelOptions } from '@common';
import {
   AUTH_V1_GRPC_CLIENT,
   AUTH_V1_GRPC_PACKAGE_NAME,
   getAuthProtoLoaderOptions,
   getAuthProtoPath,
} from '@contracts/auth';
import { HEALTH_GRPC_PACKAGE_NAME, getHealthProtoPath } from '@contracts/health';
import { GatewayConfigModule, GatewayConfigService } from '@/config';
import { AuthController } from '@/modules/auth/auth.controller';
import { AuthService } from '@/modules/auth/auth.service';

@Module({
   imports: [
      ClientsModule.registerAsync([
         {
            name: AUTH_V1_GRPC_CLIENT,
            imports: [GatewayConfigModule],
            inject: [GatewayConfigService],
            useFactory: (configService: GatewayConfigService) => ({
               transport: Transport.GRPC,
               options: {
                  package: [AUTH_V1_GRPC_PACKAGE_NAME, HEALTH_GRPC_PACKAGE_NAME],
                  protoPath: [getAuthProtoPath(), getHealthProtoPath()],
                  url: configService.authGrpcUrl,
                  loader: getAuthProtoLoaderOptions(),
                  channelOptions: createGrpcRetryChannelOptions({
                     serviceNames: [AUTH_V1_GRPC_PACKAGE_NAME],
                  }),
               },
            }),
         },
      ]),
   ],
   controllers: [AuthController],
   providers: [AuthService],
   exports: [AuthService, ClientsModule],
})
export class AuthModule {}
