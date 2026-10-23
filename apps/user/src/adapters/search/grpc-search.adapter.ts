import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import type { ClientGrpc, ClientProxy } from '@nestjs/microservices';
import { defer, firstValueFrom } from 'rxjs';
import { CircuitBreakerRegistry, RetryPolicyRegistry, SERVICES, withGrpcRetry } from '@common';
import { SEARCH_V1_GRPC_CLIENT, SEARCH_V1_GRPC_SERVICE_NAME, type ISearchV1GrpcService } from '@contracts/search';
import { USER_METRICS_LOG_MESSAGES } from '@user/constants';
import type {
   ElasticsearchSearchResult,
   ElasticsearchUserHit,
   ISearchAdapter,
} from '@user/adapters/search/search.adapter.interface';

@Injectable()
export class GrpcSearchAdapter implements ISearchAdapter, OnModuleInit {
   private readonly logger = new Logger(GrpcSearchAdapter.name);
   private searchGrpcService!: ISearchV1GrpcService;

   private readonly searchGrpcBreaker = CircuitBreakerRegistry.getOrCreate(SEARCH_V1_GRPC_SERVICE_NAME, {
      timeout: 5000,
      failureThreshold: 5,
      resetTimeout: 10000,
   });

   private readonly searchGrpcRetryPolicy = RetryPolicyRegistry.getOrCreate(SEARCH_V1_GRPC_SERVICE_NAME, {
      maxAttempts: 3,
      initialDelayMs: 100,
      multiplier: 2,
      maxDelayMs: 2000,
   });

   constructor(
      @Inject(SEARCH_V1_GRPC_CLIENT)
      private readonly searchGrpcClient: ClientGrpc,
      @Inject(SERVICES.SEARCH_SERVICE)
      private readonly searchClient: ClientProxy,
   ) {}

   onModuleInit(): void {
      this.searchGrpcService = this.searchGrpcClient.getService<ISearchV1GrpcService>(SEARCH_V1_GRPC_SERVICE_NAME);
   }

   async searchUsers(query: string, limit = 20, cursor?: string): Promise<ElasticsearchSearchResult> {
      try {
         const res = await this.searchGrpcBreaker.execute(() =>
            firstValueFrom(
               defer(() =>
                  this.searchGrpcService.searchUsers({
                     query,
                     limit,
                     cursor,
                  }),
               ).pipe(withGrpcRetry(this.searchGrpcRetryPolicy)),
            ),
         );

         const normalizedHits: ElasticsearchUserHit[] = (res.items || []).map((hit) => {
            const resolvedUserId = hit.userId;
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
               createdAt: hit.createdAt ? new Date(hit.createdAt) : undefined,
               updatedAt: hit.updatedAt ? new Date(hit.updatedAt) : undefined,
            };
         });

         return {
            items: normalizedHits,
            nextCursor: res.nextCursor ?? null,
            hasMore: res.hasMore ?? false,
            total: res.total ?? normalizedHits.length,
         };
      } catch (err) {
         this.logger.error(
            `${USER_METRICS_LOG_MESSAGES.SEARCH_QUERY_FAILED} [${query}]: ${err instanceof Error ? err.message : String(err)}`,
         );
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
