import { Module } from '@nestjs/common';
import { RedisModule } from '@common';
import { PrismaModule } from '@user/prisma';
import {
   USER_ACTIVITY_PROJECTION,
   USER_EVENT_STORE,
   USER_PROFILE_PROJECTION,
   USER_PROJECTION_REBUILD_SERVICE,
   USER_STATS_PROJECTION,
} from '@user/cqrs/constants/user-cqrs.constant';
import { UserEventStore } from '@user/cqrs/write/user-event-store';
import { UserActivityProjection, UserProfileProjection, UserStatsProjection } from '@user/cqrs/read';
import { UserProjectionRebuildService } from '@user/cqrs/services/user-projection-rebuild.service';
import { UserEventSourcingListener } from '@user/cqrs/listeners/user-event-sourcing.listener';
import { USER_CQRS_EVENT_FACTORY } from '@user/constants';
import { UserCqrsEventFactory, UserFactoriesModule } from '@user/factories';

@Module({
   imports: [PrismaModule, RedisModule, UserFactoriesModule],
   providers: [
      UserEventStore,
      {
         provide: USER_EVENT_STORE,
         useExisting: UserEventStore,
      },
      UserStatsProjection,
      {
         provide: USER_STATS_PROJECTION,
         useExisting: UserStatsProjection,
      },
      UserProfileProjection,
      {
         provide: USER_PROFILE_PROJECTION,
         useExisting: UserProfileProjection,
      },
      UserActivityProjection,
      {
         provide: USER_ACTIVITY_PROJECTION,
         useExisting: UserActivityProjection,
      },
      UserProjectionRebuildService,
      {
         provide: USER_PROJECTION_REBUILD_SERVICE,
         useExisting: UserProjectionRebuildService,
      },
      UserEventSourcingListener,
   ],
   exports: [
      UserEventStore,
      USER_EVENT_STORE,
      UserStatsProjection,
      USER_STATS_PROJECTION,
      UserProfileProjection,
      USER_PROFILE_PROJECTION,
      UserActivityProjection,
      USER_ACTIVITY_PROJECTION,
      UserProjectionRebuildService,
      USER_PROJECTION_REBUILD_SERVICE,
      UserEventSourcingListener,
      UserFactoriesModule,
      UserCqrsEventFactory,
      USER_CQRS_EVENT_FACTORY,
   ],
})
export class UserCqrsModule {}
