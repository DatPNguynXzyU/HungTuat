import '@post/tracing';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AllRpcExceptionsFilter, RmqService, SERVICES, TracingInterceptor } from '@common';
import { PostModule } from '@post/post.module';

async function bootstrap() {
   const appContext = await NestFactory.createApplicationContext(PostModule, {
      bufferLogs: true,
   });
   const logger = appContext.get(Logger);
   const rmqService = appContext.get(RmqService);

   const app = await NestFactory.createMicroservice(PostModule, rmqService.getOptions(SERVICES.POST_SERVICE));

   app.useLogger(logger);
   app.useGlobalFilters(new AllRpcExceptionsFilter());
   app.useGlobalInterceptors(new TracingInterceptor());
   await app.listen();
   logger.log('Post Microservice is listening on RabbitMQ queue: POST_SERVICE');
}

void bootstrap();
