import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AllRpcExceptionsFilter, RmqService, SERVICES } from '@common';
import { NotificationModule } from '@notification/notification.module';

async function bootstrap() {
   const appContext = await NestFactory.createApplicationContext(NotificationModule, {
      bufferLogs: true,
   });
   const logger = appContext.get(Logger);
   const rmqService = appContext.get(RmqService);

   const app = await NestFactory.createMicroservice(
      NotificationModule,
      rmqService.getOptions(SERVICES.NOTIFICATION_SERVICE),
   );

   app.useLogger(logger);
   app.useGlobalFilters(new AllRpcExceptionsFilter());
   await app.listen();
   logger.log('Notification Microservice is listening on RabbitMQ queue: NOTIFICATION_SERVICE');
}

void bootstrap();
