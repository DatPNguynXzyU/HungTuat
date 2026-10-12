import { Module } from '@nestjs/common';
import { CloudinaryModule, RmqModule, SERVICES } from '@common';
import { PrismaModule } from '@user/core/database/prisma';
import { OutboxModule } from '@user/core/outbox';
import {
   UserProfileRepository,
   USER_PROFILE_REPOSITORY,
} from '@user/modules/profile/repositories/user-profile.repository';
import { ProfileService } from '@user/modules/profile/profile.service';
import { ProfileController } from '@user/modules/profile/profile.controller';
import { UsernameBloomFilterService } from '@user/services/username-bloom-filter.service';
import { UserGraphSyncService } from '@user/services/user-graph-sync.service';
import { GraphSchemaService, GraphFollowRepository } from '@user/graph';

@Module({
   imports: [
      PrismaModule,
      OutboxModule,
      CloudinaryModule.forRoot(),
      RmqModule.register({
         name: SERVICES.SEARCH_SERVICE,
      }),
   ],
   controllers: [ProfileController],
   providers: [
      ProfileService,
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
   exports: [ProfileService, UserProfileRepository, USER_PROFILE_REPOSITORY],
})
export class ProfileModule {}
