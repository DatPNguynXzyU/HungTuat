import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AllRpcExceptionsFilter, RmqService, SERVICES } from '@common';
import { UserModule } from '@user/user.module';
import { UserConfigService } from '@user/config';

async function bootstrap() {
   const app = await NestFactory.create(UserModule, {
      bufferLogs: true,
   });
   const logger = app.get(Logger);
   const rmqService = app.get(RmqService);
   const configService = app.get(UserConfigService);

   app.useLogger(logger);

   app.useGlobalFilters(new AllRpcExceptionsFilter());

   // Connect RabbitMQ microservice
   app.connectMicroservice(rmqService.getOptions(SERVICES.USER_SERVICE), {
      inheritAppConfig: true,
   });

   await app.startAllMicroservices();

   const port = configService.port;
   await app.listen(port);

   logger.log(`User Microservice is listening on RabbitMQ queue: ${SERVICES.USER_SERVICE}`);
   logger.log(`User HTTP server is listening on port ${port} (metrics: http://localhost:${port}/metrics)`);
}

void bootstrap();
