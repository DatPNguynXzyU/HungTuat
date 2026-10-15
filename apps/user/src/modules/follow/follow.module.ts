import { Module } from '@nestjs/common';
import { NebulaModule, RetryQueueModule, RmqModule } from '@common';
import { PrismaModule } from '@user/core/database/prisma';
import { OutboxModule } from '@user/core/outbox';
import { UserDomainModule } from '@user/domain';
import { UnitOfWorkModule } from '@user/unit-of-work';
import {
   UserProfileRepository,
   USER_PROFILE_REPOSITORY,
} from '@user/modules/profile/repositories/user-profile.repository';
import { FollowRepository, FOLLOW_REPOSITORY } from '@user/modules/follow/repositories/follow.repository';
import {
   FollowGraphRepository,
   GRAPH_FOLLOW_REPOSITORY,
} from '@user/modules/follow/repositories/follow-graph.repository';
import { FollowService } from '@user/services/domain/follow.service';
import { UserGraphSyncService } from '@user/services/infrastructure/user-graph-sync.service';
import { UserResolverService } from '@user/services/infrastructure/user-resolver.service';
import { FollowController } from '@user/modules/follow/follow.controller';
import { FollowUserSaga, UnfollowUserSaga, AcceptFollowRequestSaga, RejectFollowRequestSaga } from '@user/sagas/follow';
import { FOLLOW_SAGA_FACTORY } from '@user/constants';
import { FollowSagaFactory, UserFactoriesModule } from '@user/factories';

@Module({
   imports: [
      UserDomainModule,
      UserFactoriesModule,
      PrismaModule,
      OutboxModule,
      RetryQueueModule,
      UnitOfWorkModule,
      NebulaModule.forRoot(),
      RmqModule,
   ],
   controllers: [FollowController],
   providers: [
      FollowService,
      FollowSagaFactory,
      {
         provide: FOLLOW_SAGA_FACTORY,
         useClass: FollowSagaFactory,
      },
      FollowUserSaga,
      UnfollowUserSaga,
      AcceptFollowRequestSaga,
      RejectFollowRequestSaga,
      UserResolverService,
      FollowRepository,
      {
         provide: FOLLOW_REPOSITORY,
         useClass: FollowRepository,
      },
      FollowGraphRepository,
      {
         provide: GRAPH_FOLLOW_REPOSITORY,
         useClass: FollowGraphRepository,
      },
      UserGraphSyncService,
      UserProfileRepository,
      {
         provide: USER_PROFILE_REPOSITORY,
         useClass: UserProfileRepository,
      },
   ],
   exports: [
      FollowService,
      FollowUserSaga,
      UnfollowUserSaga,
      AcceptFollowRequestSaga,
      RejectFollowRequestSaga,
      UserResolverService,
      FollowRepository,
      FOLLOW_REPOSITORY,
      FollowGraphRepository,
      GRAPH_FOLLOW_REPOSITORY,
      UserFactoriesModule,
      FollowSagaFactory,
      FOLLOW_SAGA_FACTORY,
      UserGraphSyncService,
   ],
})
export class FollowModule {}
