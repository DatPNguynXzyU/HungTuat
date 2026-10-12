import { Module } from '@nestjs/common';
import { RmqModule, SERVICES } from '@common';
import { PrismaModule } from '@user/core/database/prisma';
import {
   UserProfileRepository,
   USER_PROFILE_REPOSITORY,
} from '@user/modules/profile/repositories/user-profile.repository';
import { FollowRepository, FOLLOW_REPOSITORY } from '@user/modules/follow/repositories/follow.repository';
import { UserIndexListener } from './listeners/user-index.listener';
import { UserSearchService } from './user-search.service';
import { SearchController } from './search.controller';

@Module({
   imports: [
      PrismaModule,
      RmqModule.register({
         name: SERVICES.SEARCH_SERVICE,
      }),
   ],
   controllers: [SearchController],
   providers: [
      UserIndexListener,
      UserSearchService,
      UserProfileRepository,
      {
         provide: USER_PROFILE_REPOSITORY,
         useClass: UserProfileRepository,
      },
      FollowRepository,
      {
         provide: FOLLOW_REPOSITORY,
         useClass: FollowRepository,
      },
   ],
   exports: [UserSearchService, UserIndexListener],
})
export class SearchModule {}
