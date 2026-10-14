import { Module } from '@nestjs/common';
import { RmqModule, SERVICES } from '@common';
import { PrismaModule } from '@user/core/database/prisma';
import {
   UserProfileRepository,
   USER_PROFILE_REPOSITORY,
} from '@user/modules/profile/repositories/user-profile.repository';
import { FollowRepository, FOLLOW_REPOSITORY } from '@user/modules/follow/repositories/follow.repository';
import { UserIndexListener } from '@user/modules/search/listeners/user-index.listener';
import { UserSearchService } from '@user/modules/search/user-search.service';
import { SearchController } from '@user/modules/search/search.controller';
import { UserResolverService } from '@user/shared/services';

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
      UserResolverService,
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
