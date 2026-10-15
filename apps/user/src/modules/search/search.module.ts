import { Module } from '@nestjs/common';
import { PrismaModule } from '@user/core/database/prisma';
import { UserAdaptersModule, SEARCH_ADAPTER } from '@user/adapters';
import {
   UserProfileRepository,
   USER_PROFILE_REPOSITORY,
} from '@user/modules/profile/repositories/user-profile.repository';
import { FollowRepository, FOLLOW_REPOSITORY } from '@user/modules/follow/repositories/follow.repository';
import { UserIndexListener } from '@user/modules/search/listeners/user-index.listener';
import { UserSearchService } from '@user/services/domain/user-search.service';
import { SearchController } from '@user/modules/search/search.controller';
import { UserResolverService } from '@user/services/infrastructure/user-resolver.service';

@Module({
   imports: [PrismaModule, UserAdaptersModule],
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
   exports: [UserSearchService, UserIndexListener, SEARCH_ADAPTER, UserAdaptersModule],
})
export class SearchModule {}
