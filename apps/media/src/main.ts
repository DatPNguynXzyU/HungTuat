import { NestFactory } from '@nestjs/core';
import { AllRpcExceptionsFilter, RmqService, SERVICES } from '@common';
import { MediaModule } from './media.module';

async function bootstrap() {
   const appContext = await NestFactory.createApplicationContext(MediaModule, {
      bufferLogs: true,
   });
   const rmqService = appContext.get(RmqService);

   const app = await NestFactory.createMicroservice(MediaModule, rmqService.getOptions(SERVICES.MEDIA_SERVICE));

   app.useGlobalFilters(new AllRpcExceptionsFilter());
   await app.listen();
   console.log('Media Microservice is listening on RabbitMQ queue: MEDIA_SERVICE');
}

void bootstrap();
