import { Global, Module } from '@nestjs/common';
import { USER_METRICS_SERVICE, UserMetricsService } from '@user/services/infrastructure';

@Global()
@Module({
   providers: [
      UserMetricsService,
      {
         provide: USER_METRICS_SERVICE,
         useExisting: UserMetricsService,
      },
   ],
   exports: [USER_METRICS_SERVICE, UserMetricsService],
})
export class UserMetricsModule {}
