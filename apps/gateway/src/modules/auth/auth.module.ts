import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RmqModule, SERVICES } from '@common';
import { AUTH_V1_GRPC_CLIENT, AUTH_V1_GRPC_PACKAGE_NAME, getAuthProtoPath } from '@contracts/auth';
import { HEALTH_GRPC_PACKAGE_NAME, getHealthProtoPath } from '@contracts/health';
import { GatewayConfigModule, GatewayConfigService } from '@/config';
import { AuthController } from '@/modules/auth/auth.controller';
import { AuthService } from '@/modules/auth/auth.service';

@Module({
   imports: [
      RmqModule.register({
         name: SERVICES.AUTH_SERVICE,
      }),
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
               },
            }),
         },
      ]),
   ],
   controllers: [AuthController],
   providers: [AuthService],
   exports: [AuthService],
})
export class AuthModule {}
