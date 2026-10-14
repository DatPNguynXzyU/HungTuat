import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AllRpcExceptionsFilter, RmqService, SERVICES } from '@common';
import { AuthModule } from '@auth/auth.module';
import { AuthConfigService } from '@auth/config';

async function bootstrap() {
   const app = await NestFactory.create(AuthModule, {
      bufferLogs: true,
   });
   const logger = app.get(Logger);
   const rmqService = app.get(RmqService);
   const configService = app.get(AuthConfigService);

   app.useLogger(logger);

   // Connect RabbitMQ microservice
   app.connectMicroservice(rmqService.getOptions(SERVICES.AUTH_SERVICE));
   app.useGlobalFilters(new AllRpcExceptionsFilter());

   await app.startAllMicroservices();

   const port = configService.port;
   await app.listen(port);

   logger.log(`Auth Microservice is listening on RabbitMQ queue: ${SERVICES.AUTH_SERVICE}`);
   logger.log(`Auth HTTP server is listening on port ${port} (metrics: http://localhost:${port}/metrics)`);
}

void bootstrap();
