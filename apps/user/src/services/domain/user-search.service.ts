import { Inject, Injectable } from '@nestjs/common';
import { UserSearchResultItemDto, UserSearchResponseDto } from '@contracts/user';
import { FOLLOW_REPOSITORY, type IFollowRepository } from '@user/repositories';
import { UserResolverService } from '@user/services/infrastructure/user-resolver.service';
import { SEARCH_ADAPTER, type ISearchAdapter } from '@user/adapters/search';
import { UserSearchResultItemBuilder } from '@user/builders';

/**
 * UserSearchService coordinates user search and discovery operations:
 * - Queries Elasticsearch via ISearchAdapter (decoupled from RabbitMQ transport)
 * - Resolves requesting user's identity via UserResolverService
 * - Enriches search results with social graph relationships (following, follower, isSelf)
 */
@Injectable()
export class UserSearchService {
   constructor(
      private readonly userResolverService: UserResolverService,
      @Inject(FOLLOW_REPOSITORY)
      private readonly followRepository: IFollowRepository,
      @Inject(SEARCH_ADAPTER)
      private readonly searchAdapter: ISearchAdapter,
   ) {}

   async searchUsers(
      query: string,
      limit = 20,
      cursor?: string,
      currentUserId?: string,
   ): Promise<UserSearchResponseDto> {
      const esResult = await this.searchAdapter.searchUsers(query, limit, cursor);
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
            const user = await this.userResolverService.findUser(currentUserId);
            if (user) {
               resolvedCurrentUserId = user.userId;
            }
         } catch {
            // Keep currentUserId as-is
         }
      }

      const targetUserIds = esUsers.map((u) => u.userId);
      let followingSet = new Set<string>();
      let followerSet = new Set<string>();

      if (resolvedCurrentUserId) {
         const relations = await this.followRepository.findFollowRelations(resolvedCurrentUserId, targetUserIds);
         followingSet = relations.followingSet;
         followerSet = relations.followerSet;
      }

      const items: UserSearchResultItemDto[] = esUsers.map((user) =>
         UserSearchResultItemBuilder.create()
            .fromDocument(user)
            .withRelationshipContext({
               currentUserId: resolvedCurrentUserId,
               followingSet,
               followerSet,
            })
            .build(),
      );

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
}
