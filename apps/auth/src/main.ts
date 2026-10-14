import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AllRpcExceptionsFilter, RmqService, SERVICES } from '@common';
import { AuthModule } from '@auth/auth.module';

async function bootstrap() {
   const app = await NestFactory.create(AuthModule, {
      bufferLogs: true,
   });
   const logger = app.get(Logger);
   const rmqService = app.get(RmqService);

   app.useLogger(logger);

   // Connect RabbitMQ microservice
   const microservice = app.connectMicroservice(rmqService.getOptions(SERVICES.AUTH_SERVICE));
   microservice.useGlobalFilters(new AllRpcExceptionsFilter());

   await app.startAllMicroservices();

   const port = process.env.PORT || process.env.AUTH_PORT || 3001;
   await app.listen(port);

   logger.log(`Auth Microservice is listening on RabbitMQ queue: ${SERVICES.AUTH_SERVICE}`);
   logger.log(`Auth HTTP server is listening on port ${port} (metrics: http://localhost:${port}/metrics)`);
}

void bootstrap();
