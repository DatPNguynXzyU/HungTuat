import '@commerce/tracing';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AllRpcExceptionsFilter, RmqService, SERVICES, TracingInterceptor } from '@common';
import {
   COMMERCE_V1_GRPC_PACKAGE_NAME,
   getCommerceProtoLoaderOptions,
   getCommerceProtoPath,
} from '@contracts/commerce';
import { HEALTH_GRPC_PACKAGE_NAME, getHealthProtoPath } from '@contracts/health';
import { CommerceModule } from '@commerce/commerce.module';
import { CommerceConfigService } from '@commerce/config';

async function bootstrap() {
   const app = await NestFactory.create(CommerceModule, {
      bufferLogs: true,
   });
   const logger = app.get(Logger);
   const rmqService = app.get(RmqService);
   const configService = app.get(CommerceConfigService);

   app.useLogger(logger);

   app.useGlobalFilters(new AllRpcExceptionsFilter());
   app.useGlobalInterceptors(new TracingInterceptor());

   // Connect RabbitMQ microservice
   app.connectMicroservice(rmqService.getOptions(SERVICES.COMMERCE_SERVICE), {
      inheritAppConfig: true,
   });

   // Connect gRPC microservice
   app.connectMicroservice<MicroserviceOptions>(
      {
         transport: Transport.GRPC,
         options: {
            package: [COMMERCE_V1_GRPC_PACKAGE_NAME, HEALTH_GRPC_PACKAGE_NAME],
            protoPath: [getCommerceProtoPath(), getHealthProtoPath()],
            url: configService.grpcUrl,
            loader: getCommerceProtoLoaderOptions(),
         },
      },
      {
         inheritAppConfig: true,
      },
   );

   await app.startAllMicroservices();

   const port = configService.port;
   await app.listen(port);

   logger.log(`Commerce Microservice is listening on RabbitMQ queue: ${SERVICES.COMMERCE_SERVICE}`);
   logger.log(`Commerce gRPC Microservice is listening on ${configService.grpcUrl}`);
   logger.log(`Commerce HTTP server is listening on port ${port} (metrics: http://localhost:${port}/metrics)`);
}

void bootstrap();
