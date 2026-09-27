import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AllRpcExceptionsFilter, RmqService, SERVICES } from '@common';
import { AuthModule } from '@auth/auth.module';

async function bootstrap() {
   const appContext = await NestFactory.createApplicationContext(AuthModule, {
      bufferLogs: true,
   });
   const logger = appContext.get(Logger);
   const rmqService = appContext.get(RmqService);

   const app = await NestFactory.createMicroservice(AuthModule, rmqService.getOptions(SERVICES.AUTH_SERVICE));

   app.useLogger(logger);
   app.useGlobalFilters(new AllRpcExceptionsFilter());
   await app.listen();
   logger.log('Auth Microservice is listening on RabbitMQ queue: AUTH_SERVICE');
}

void bootstrap();
