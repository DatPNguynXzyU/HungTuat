import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { SEARCH_PATTERNS, SERVICES, UserSearchResultItemDto, UserSearchResponseDto } from '@common';
import {
   UserProfileRepository,
   USER_PROFILE_REPOSITORY,
} from '@user/modules/profile/repositories/user-profile.repository';
import { FollowRepository, FOLLOW_REPOSITORY } from '@user/modules/follow/repositories/follow.repository';
import { UserIndexListener } from './listeners/user-index.listener';

@Injectable()
export class UserSearchService {
   private readonly logger = new Logger(UserSearchService.name);

   constructor(
      @Inject(SERVICES.SEARCH_SERVICE)
      private readonly searchClient: ClientProxy,
      @Inject(USER_PROFILE_REPOSITORY)
      private readonly userProfileRepository: UserProfileRepository,
      @Inject(FOLLOW_REPOSITORY)
      private readonly followRepository: FollowRepository,
      private readonly userIndexListener: UserIndexListener,
   ) {}

   async searchUsers(
      query: string,
      limit = 20,
      cursor?: string,
      currentUserId?: string,
   ): Promise<UserSearchResponseDto> {
      let esResult: {
         items: Array<{
            id: string;
            email?: string | null;
            username?: string | null;
            displayName?: string | null;
            avatar?: string | null;
            bio?: string | null;
            isVerified?: boolean;
            followersCount?: number;
            followingCount?: number;
            createdAt?: Date;
            updatedAt?: Date;
         }>;
         nextCursor: string | null;
         hasMore: boolean;
         total?: number;
      };

      try {
         esResult = await firstValueFrom(
            this.searchClient.send<
               {
                  items: Array<{
                     id: string;
                     email?: string | null;
                     username?: string | null;
                     displayName?: string | null;
                     avatar?: string | null;
                     bio?: string | null;
                     isVerified?: boolean;
                     followersCount?: number;
                     followingCount?: number;
                     createdAt?: Date;
                     updatedAt?: Date;
                  }>;
                  nextCursor: string | null;
                  hasMore: boolean;
                  total?: number;
               },
               { query: string; limit?: number; cursor?: string }
            >({ cmd: SEARCH_PATTERNS.SEARCH_USERS }, { query, limit, cursor }),
         );
      } catch (err) {
         this.logger.error(`Search Service query failed for ${query}: ${String(err)}`);
         esResult = { items: [], nextCursor: null, hasMore: false, total: 0 };
      }

      const { items: esUsers = [], nextCursor = null, hasMore = false, total = 0 } = esResult;

      if (esUsers.length === 0) {
         return {
            items: [],
            meta: {
               nextCursor: null,
               hasMore: false,
               limit,
               total: total ?? 0,
            },
         };
      }

      let resolvedCurrentUserId = currentUserId;
      if (currentUserId) {
         try {
            let user = await this.userProfileRepository.findById(currentUserId);
            if (!user) {
               user = await this.userProfileRepository.findByAccountId(currentUserId);
            }
            if (user) {
               resolvedCurrentUserId = user.id;
            }
         } catch {
            // Keep currentUserId as-is
         }
      }

      const targetUserIds = esUsers.map((u) => u.id);
      let followingSet = new Set<string>();
      let followerSet = new Set<string>();

      if (resolvedCurrentUserId) {
         const relations = await this.followRepository.findFollowRelations(resolvedCurrentUserId, targetUserIds);
         followingSet = relations.followingSet;
         followerSet = relations.followerSet;
      }

      const items: UserSearchResultItemDto[] = esUsers.map((user) => ({
         id: user.id,
         username: user.username,
         displayName: user.displayName,
         avatar: user.avatar,
         bio: user.bio,
         isVerified: user.isVerified ?? false,
         followersCount: user.followersCount ?? 0,
         followingCount: user.followingCount ?? 0,
         isFollowing: resolvedCurrentUserId ? followingSet.has(user.id) : false,
         isFollower: resolvedCurrentUserId ? followerSet.has(user.id) : false,
         isSelf: resolvedCurrentUserId ? resolvedCurrentUserId === user.id : false,
      }));

      return {
         items,
         meta: {
            nextCursor,
            hasMore,
            limit,
            total,
         },
      };
   }

   getListener(): UserIndexListener {
      return this.userIndexListener;
   }
}
