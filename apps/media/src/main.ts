import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AllRpcExceptionsFilter, RmqService, SERVICES } from '@common';
import { MediaModule } from '@media/media.module';

async function bootstrap() {
   const appContext = await NestFactory.createApplicationContext(MediaModule, {
      bufferLogs: true,
   });
   const logger = appContext.get(Logger);
   const rmqService = appContext.get(RmqService);

   const app = await NestFactory.createMicroservice(MediaModule, rmqService.getOptions(SERVICES.MEDIA_SERVICE));

   app.useLogger(logger);
   app.useGlobalFilters(new AllRpcExceptionsFilter());
   await app.listen();
   logger.log('Media Microservice is listening on RabbitMQ queue: MEDIA_SERVICE');
}

void bootstrap();
