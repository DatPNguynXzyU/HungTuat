import { Module } from '@nestjs/common';
import { NebulaModule, RedisModule, RetryQueueModule, RmqModule, SERVICES } from '@common';
import { PrismaModule } from '@user/core/database/prisma';
import { OutboxModule } from '@user/core/outbox';
import {
   UserProfileRepository,
   USER_PROFILE_REPOSITORY,
} from '@user/modules/profile/repositories/user-profile.repository';
import { ProfileService } from '@user/modules/profile/profile.service';
import { ProfileController } from '@user/modules/profile/profile.controller';
import { UsernameBloomFilterService } from '@user/modules/authentication/services/username-bloom-filter.service';
import { UserGraphSyncService } from '@user/modules/follow/services/follow-sync.service';
import { GraphSchemaService, GraphFollowRepository } from '@user/graph';
import { UserResolverService } from '@user/shared/services';

@Module({
   imports: [
      PrismaModule,
      OutboxModule,
      RetryQueueModule,
      RedisModule,
      NebulaModule.forRoot(),
      RmqModule.register({
         name: SERVICES.MEDIA_SERVICE,
      }),
      RmqModule.register({
         name: SERVICES.SEARCH_SERVICE,
      }),
   ],
   controllers: [ProfileController],
   providers: [
      ProfileService,
      UserResolverService,
      UserProfileRepository,
      {
         provide: USER_PROFILE_REPOSITORY,
         useClass: UserProfileRepository,
      },
      UsernameBloomFilterService,
      UserGraphSyncService,
      GraphSchemaService,
      GraphFollowRepository,
   ],
   exports: [ProfileService, UserResolverService, UserProfileRepository, USER_PROFILE_REPOSITORY],
})
export class ProfileModule {}
