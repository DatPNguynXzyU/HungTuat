import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { SERVICES } from '@common';
import { SEARCH_PATTERNS } from '@contracts/search';
import { USER_METRICS_LOG_MESSAGES } from '@user/constants';
import type {
   ElasticsearchSearchResult,
   ElasticsearchUserHit,
   ISearchAdapter,
} from '@user/adapters/search/search.adapter.interface';

@Injectable()
export class RabbitMqSearchAdapter implements ISearchAdapter {
   private readonly logger = new Logger(RabbitMqSearchAdapter.name);

   constructor(
      @Inject(SERVICES.SEARCH_SERVICE)
      private readonly searchClient: ClientProxy,
   ) {}

   async searchUsers(query: string, limit = 20, cursor?: string): Promise<ElasticsearchSearchResult> {
      try {
         const rawResult = await firstValueFrom(
            this.searchClient.send<
               {
                  items?: Array<{
                     documentId?: string;
                     userId?: string;
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
                  nextCursor?: string | null;
                  hasMore?: boolean;
                  total?: number;
               },
               { query: string; limit?: number; cursor?: string }
            >({ cmd: SEARCH_PATTERNS.SEARCH_USERS }, { query, limit, cursor }),
         );

         const normalizedHits: ElasticsearchUserHit[] = (rawResult.items || []).map((hit) => {
            const resolvedUserId = hit.userId ?? hit.documentId ?? '';
            const resolvedDocumentId = hit.documentId ?? resolvedUserId;
            return {
               userId: resolvedUserId,
               documentId: resolvedDocumentId,
               email: hit.email,
               username: hit.username,
               displayName: hit.displayName,
               avatar: hit.avatar,
               bio: hit.bio,
               isVerified: hit.isVerified,
               followersCount: hit.followersCount,
               followingCount: hit.followingCount,
               createdAt: hit.createdAt,
               updatedAt: hit.updatedAt,
            };
         });

         return {
            items: normalizedHits,
            nextCursor: rawResult.nextCursor ?? null,
            hasMore: rawResult.hasMore ?? false,
            total: rawResult.total ?? 0,
         };
      } catch (err) {
         this.logger.error(`${USER_METRICS_LOG_MESSAGES.SEARCH_QUERY_FAILED} [${query}]: ${String(err)}`);
         return { items: [], nextCursor: null, hasMore: false, total: 0 };
      }
   }

   emitIndexEvent(pattern: string, payload: unknown): void {
      try {
         this.searchClient.emit(pattern, payload);
      } catch (err) {
         this.logger.error(`${USER_METRICS_LOG_MESSAGES.EMIT_INDEX_EVENT_FAILED} [${pattern}]: ${String(err)}`);
      }
   }
}
