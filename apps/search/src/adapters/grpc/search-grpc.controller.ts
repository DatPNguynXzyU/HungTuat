import { Controller, UseFilters, UseInterceptors } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import type { Metadata } from '@grpc/grpc-js';
import { from, type Observable } from 'rxjs';
import { GrpcExceptionFilter, GrpcLoggingInterceptor, GrpcMetricsInterceptor } from '@common';
import {
   SEARCH_V1_GRPC_METHODS,
   SEARCH_V1_GRPC_SERVICE_NAME,
   type IGlobalSearchRequest,
   type IGlobalSearchResponse,
   type IIngredientSearchHitProto,
   type ISearchIngredientsRequest,
   type ISearchIngredientsResponse,
   type ISearchUsersRequest,
   type ISearchUsersResponse,
   type ISearchV1GrpcService,
   type IUserSearchHitProto,
} from '@contracts/search';
import { UserSearchService, type UserDocument } from '@search/domains/user-search/user-search.service';
import {
   IngredientSearchService,
   type IngredientDocument,
} from '@search/domains/ingredient-search/ingredient-search.service';

/**
 * Inbound Adapter (Hexagonal Architecture) handling incoming gRPC requests for SearchService.
 * Multiplexed HTTP/2 high-throughput search queries.
 */
@Controller()
@UseFilters(new GrpcExceptionFilter())
@UseInterceptors(GrpcLoggingInterceptor, GrpcMetricsInterceptor)
export class SearchGrpcController implements ISearchV1GrpcService {
   constructor(
      private readonly userSearchService: UserSearchService,
      private readonly ingredientSearchService: IngredientSearchService,
   ) {}

   private mapUserToProto(user: UserDocument): IUserSearchHitProto {
      return {
         userId: user.id,
         documentId: user.id,
         email: user.email ?? undefined,
         username: user.username ?? undefined,
         displayName: user.displayName ?? undefined,
         avatar: user.avatar ?? undefined,
         bio: user.bio ?? undefined,
         isVerified: user.isVerified ?? undefined,
         followersCount: user.followersCount ?? undefined,
         followingCount: user.followingCount ?? undefined,
         createdAt:
            user.createdAt instanceof Date
               ? user.createdAt.toISOString()
               : user.createdAt
                 ? String(user.createdAt)
                 : undefined,
         updatedAt:
            user.updatedAt instanceof Date
               ? user.updatedAt.toISOString()
               : user.updatedAt
                 ? String(user.updatedAt)
                 : undefined,
      };
   }

   private mapIngredientToProto(doc: IngredientDocument): IIngredientSearchHitProto {
      return {
         ingredientId: doc.ingredientId,
         ingredientName: doc.ingredientName,
         normalizedName: doc.normalizedName,
         ingredientSlug: doc.ingredientSlug,
         ingredientDescription: doc.ingredientDescription,
         ingredientImageUrl: doc.ingredientImageUrl,
         categoryId: doc.categoryId,
         categoryName: doc.categoryName,
         defaultUnit: doc.defaultUnit,
         ingredientStatus: doc.ingredientStatus,
         supplierCount: doc.supplierCount ?? 0,
         minPrice: doc.minPrice ?? 0,
         maxPrice: doc.maxPrice ?? 0,
         currency: doc.currency,
         createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
         updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
      };
   }

   @GrpcMethod(SEARCH_V1_GRPC_SERVICE_NAME, SEARCH_V1_GRPC_METHODS.SEARCH_USERS)
   searchUsers(request: ISearchUsersRequest, _metadata?: Metadata): Observable<ISearchUsersResponse> {
      return from(
         this.userSearchService.searchUsers(request.query, request.limit, request.cursor).then((res) => ({
            items: res.items.map((item) => this.mapUserToProto(item)),
            nextCursor: res.nextCursor ?? undefined,
            hasMore: res.hasMore,
            total: res.total ?? res.items.length,
         })),
      );
   }

   @GrpcMethod(SEARCH_V1_GRPC_SERVICE_NAME, SEARCH_V1_GRPC_METHODS.SEARCH_INGREDIENTS)
   searchIngredients(request: ISearchIngredientsRequest, _metadata?: Metadata): Observable<ISearchIngredientsResponse> {
      return from(
         this.ingredientSearchService
            .searchIngredients({
               query: request.query,
               categoryId: request.categoryId,
               limit: request.limit,
               offset: request.offset,
            })
            .then((res) => ({
               items: res.items.map((item) => this.mapIngredientToProto(item)),
               total: res.total,
               limit: res.limit,
               offset: res.offset,
            })),
      );
   }

   @GrpcMethod(SEARCH_V1_GRPC_SERVICE_NAME, SEARCH_V1_GRPC_METHODS.GLOBAL_SEARCH)
   globalSearch(request: IGlobalSearchRequest, _metadata?: Metadata): Observable<IGlobalSearchResponse> {
      return from(
         Promise.all([
            this.userSearchService.searchUsers(request.query, request.limit),
            this.ingredientSearchService.searchIngredients({ query: request.query, limit: request.limit }),
         ]).then(([usersRes, ingredientsRes]) => ({
            users: usersRes.items.map((u) => this.mapUserToProto(u)),
            ingredients: ingredientsRes.items.map((i) => this.mapIngredientToProto(i)),
            total: (usersRes.total ?? usersRes.items.length) + ingredientsRes.total,
         })),
      );
   }
}
