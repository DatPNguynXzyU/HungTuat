import '@search/tracing';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AllRpcExceptionsFilter, RmqService, SERVICES, TracingInterceptor } from '@common';
import { SearchModule } from '@search/search.module';
import { SearchConfigService } from '@search/config';

async function bootstrap() {
   const app = await NestFactory.create(SearchModule, {
      bufferLogs: true,
   });
   const logger = app.get(Logger);
   app.useLogger(logger);

   const rmqService = app.get(RmqService);
   app.useGlobalFilters(new AllRpcExceptionsFilter());
   app.useGlobalInterceptors(new TracingInterceptor());

   app.connectMicroservice(rmqService.getOptions(SERVICES.SEARCH_SERVICE), {
      inheritAppConfig: true,
   });

   await app.startAllMicroservices();
   logger.log('Search Microservice is listening on RabbitMQ queue: SEARCH_SERVICE');

   const configService = app.get(SearchConfigService);
   const port = configService.httpPort;
   await app.listen(port);
   logger.log(`Search Service HTTP (health checks & metrics) listening on port ${port}`);
}

void bootstrap();
