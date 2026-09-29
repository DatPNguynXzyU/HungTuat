import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AllRpcExceptionsFilter, RmqService, SERVICES } from '@common';
import { UserModule } from '@user/user.module';

async function bootstrap() {
   const appContext = await NestFactory.createApplicationContext(UserModule, {
      bufferLogs: true,
   });
   const logger = appContext.get(Logger);
   const rmqService = appContext.get(RmqService);

   const app = await NestFactory.createMicroservice(UserModule, rmqService.getOptions(SERVICES.USER_SERVICE));

   app.useLogger(logger);
   app.useGlobalFilters(new AllRpcExceptionsFilter());
   await app.listen();
   logger.log('User Microservice is listening on RabbitMQ queue: USER_SERVICE');
}

void bootstrap();
