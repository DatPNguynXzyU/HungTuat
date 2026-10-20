import { Global, Module } from '@nestjs/common';
import { TracingService } from '@common/tracing/tracing.service';
import { TracingInterceptor } from '@common/tracing/interceptors/tracing.interceptor';

@Global()
@Module({
   providers: [TracingService, TracingInterceptor],
   exports: [TracingService, TracingInterceptor],
})
export class TracingModule {}
