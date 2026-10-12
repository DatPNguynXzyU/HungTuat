import { Module } from '@nestjs/common';
import { NebulaModule } from '@common';
import { PrismaModule } from '@user/core/database/prisma';
import { OutboxModule } from '@user/core/outbox';
import {
   UserProfileRepository,
   USER_PROFILE_REPOSITORY,
} from '@user/modules/profile/repositories/user-profile.repository';
import { FollowRepository, FOLLOW_REPOSITORY } from './repositories/follow.repository';
import { FollowGraphRepository, GRAPH_FOLLOW_REPOSITORY } from './repositories/follow-graph.repository';
import { FollowSyncService } from './services/follow-sync.service';
import { FollowService } from './follow.service';
import { FollowController } from './follow.controller';

@Module({
   imports: [PrismaModule, OutboxModule, NebulaModule.forRoot()],
   controllers: [FollowController],
   providers: [
      FollowService,
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
      FollowRepository,
      FOLLOW_REPOSITORY,
      FollowGraphRepository,
      GRAPH_FOLLOW_REPOSITORY,
      FollowSyncService,
   ],
})
export class FollowModule {}
