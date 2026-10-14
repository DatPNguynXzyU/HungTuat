import { Module } from '@nestjs/common';
import { NebulaModule, RetryQueueModule, RmqModule } from '@common';
import { PrismaModule } from '@user/core/database/prisma';
import { OutboxModule } from '@user/core/outbox';
import {
   UserProfileRepository,
   USER_PROFILE_REPOSITORY,
} from '@user/modules/profile/repositories/user-profile.repository';
import { FollowRepository, FOLLOW_REPOSITORY } from '@user/modules/follow/repositories/follow.repository';
import {
   FollowGraphRepository,
   GRAPH_FOLLOW_REPOSITORY,
} from '@user/modules/follow/repositories/follow-graph.repository';
import { FollowSyncService } from '@user/modules/follow/services/follow-sync.service';
import { FollowService } from '@user/modules/follow/follow.service';
import { FollowController } from '@user/modules/follow/follow.controller';
import { UserResolverService } from '@user/shared/services';

@Module({
   imports: [PrismaModule, OutboxModule, RetryQueueModule, NebulaModule.forRoot(), RmqModule],
   controllers: [FollowController],
   providers: [
      FollowService,
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
      FollowSyncService,
      UserProfileRepository,
      {
         provide: USER_PROFILE_REPOSITORY,
         useClass: UserProfileRepository,
      },
   ],
   exports: [
      FollowService,
      UserResolverService,
      FollowRepository,
      FOLLOW_REPOSITORY,
      FollowGraphRepository,
      GRAPH_FOLLOW_REPOSITORY,
      FollowSyncService,
   ],
})
export class FollowModule {}
