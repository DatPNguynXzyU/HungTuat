import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import type { ClientGrpc, ClientProxy } from '@nestjs/microservices';
import { defer, firstValueFrom, timeout } from 'rxjs';
import {
   CircuitBreakerRegistry,
   COMMON_ERROR_CODES,
   createGrpcMetadata,
   handleGrpcError,
   InternalServerException,
   RetryPolicyRegistry,
   SERVICES,
   SERVICE_NAMES,
   withGrpcRetry,
} from '@common';
import { SEARCH_PATTERNS } from '@contracts/search';
import {
   COMMERCE_V1_GRPC_CLIENT,
   COMMERCE_V1_GRPC_SERVICE_NAME,
   type CategoryItemDto,
   type CreateIngredientDto,
   type CreateProductOfferDto,
   type ICommerceV1GrpcService,
   type IngredientItemDto,
   type IngredientSuppliersResponseDto,
   type SearchIngredientsDto,
   type SearchIngredientsResponseDto,
   type SupplierProductOfferDto,
} from '@contracts/commerce';
import type { IHealthCheckResponse, IHealthGrpcService } from '@contracts/health';
import { HEALTH_GRPC_SERVICE_NAME } from '@contracts/health';
import type { ISupplierProto, SupplierItemDto, SupplierStatusType } from '@contracts/supplier';

@Injectable()
export class CommerceService implements OnModuleInit {
   private commerceGrpcService!: ICommerceV1GrpcService;
   private readonly commerceGrpcBreaker = CircuitBreakerRegistry.getOrCreate(COMMERCE_V1_GRPC_SERVICE_NAME, {
      timeout: 3000,
      failureThreshold: 5,
      resetTimeout: 10000,
   });
   private readonly commerceGrpcRetryPolicy = RetryPolicyRegistry.getOrCreate(COMMERCE_V1_GRPC_SERVICE_NAME, {
      maxAttempts: 3,
      initialDelayMs: 100,
      multiplier: 2,
      maxDelayMs: 2000,
   });

   constructor(
      @Inject(COMMERCE_V1_GRPC_CLIENT) private readonly commerceGrpcClient: ClientGrpc,
      @Inject(SERVICES.SEARCH_SERVICE) private readonly searchClient: ClientProxy,
   ) {}

   onModuleInit(): void {
      this.commerceGrpcService =
         this.commerceGrpcClient.getService<ICommerceV1GrpcService>(COMMERCE_V1_GRPC_SERVICE_NAME);
   }

   private mapProtoToSupplierDto(supp: ISupplierProto): SupplierItemDto {
      return {
         supplierId: supp.supplierId,
         supplierName: supp.supplierName,
         supplierSlug: supp.supplierSlug,
         supplierCode: supp.supplierCode,
         contactEmail: supp.contactEmail || undefined,
         contactPhone: supp.contactPhone || undefined,
         address: supp.address || undefined,
         city: supp.city || undefined,
         rating: supp.rating,
         isVerified: supp.isVerified,
         supplierStatus: supp.supplierStatus as SupplierStatusType,
         supplierLogoUrl: supp.supplierLogoUrl || undefined,
      };
   }

   async searchIngredients(dto: SearchIngredientsDto): Promise<SearchIngredientsResponseDto> {
      try {
         const res = await firstValueFrom(
            this.searchClient
               .send<SearchIngredientsResponseDto, SearchIngredientsDto>(
                  { cmd: SEARCH_PATTERNS.SEARCH_INGREDIENTS },
                  dto,
               )
               .pipe(timeout(5000)),
         );

         return {
            items: (res?.items ?? []).map((i) => ({
               ingredientId: i.ingredientId,
               ingredientName: i.ingredientName,
               normalizedName: i.normalizedName,
               ingredientSlug: i.ingredientSlug,
               ingredientDescription: i.ingredientDescription,
               ingredientImageUrl: i.ingredientImageUrl,
               categoryId: i.categoryId,
               categoryName: i.categoryName,
               defaultUnit: i.defaultUnit,
               ingredientStatus: i.ingredientStatus,
               supplierCount: i.supplierCount ?? 0,
               minPrice: i.minPrice ?? 0,
               maxPrice: i.maxPrice ?? 0,
               currency: i.currency,
            })),
            total: res?.total ?? 0,
            limit: res?.limit ?? dto.limit ?? 20,
            offset: res?.offset ?? dto.offset ?? 0,
         };
      } catch (error: unknown) {
         throw new InternalServerException(COMMON_ERROR_CODES.INTERNAL_SERVER_ERROR, {
            cause: error instanceof Error ? error : new Error(String(error)),
         });
      }
   }

   async getIngredientById(
      ingredientId: string,
      correlationId?: string,
   ): Promise<{ ingredient: IngredientItemDto; offers: SupplierProductOfferDto[] }> {
      try {
         const metadata = createGrpcMetadata({
            correlationId,
            callerService: SERVICE_NAMES.GATEWAY,
         });

         return await this.commerceGrpcBreaker.execute(async () => {
            const res = await firstValueFrom(
               defer(() => this.commerceGrpcService.getIngredientById({ ingredientId }, metadata)).pipe(
                  withGrpcRetry(this.commerceGrpcRetryPolicy),
               ),
            );

            const ing = res.ingredient!;
            return {
               ingredient: {
                  ingredientId: ing.ingredientId,
                  ingredientName: ing.ingredientName,
                  normalizedName: ing.normalizedName,
                  ingredientSlug: ing.ingredientSlug,
                  ingredientDescription: ing.ingredientDescription,
                  ingredientImageUrl: ing.ingredientImageUrl,
                  categoryId: ing.categoryId,
                  categoryName: ing.categoryName,
                  defaultUnit: ing.defaultUnit,
                  ingredientStatus: ing.ingredientStatus,
                  supplierCount: ing.supplierCount,
                  minPrice: ing.minPrice,
                  maxPrice: ing.maxPrice,
                  currency: ing.currency,
               },
               offers: res.offers.map((offer) => ({
                  productId: offer.productId,
                  supplierId: offer.supplierId,
                  ingredientId: offer.ingredientId,
                  productSku: offer.productSku,
                  productTitle: offer.productTitle,
                  price: offer.price,
                  currency: offer.currency,
                  originalPrice: offer.originalPrice || undefined,
                  packageSize: offer.packageSize || undefined,
                  stockQuantity: offer.stockQuantity,
                  inStock: offer.inStock,
                  productUrl: offer.productUrl || undefined,
                  productImageUrl: offer.productImageUrl || undefined,
                  offerStatus: offer.offerStatus,
                  supplier: offer.supplier ? this.mapProtoToSupplierDto(offer.supplier) : undefined,
               })),
            };
         });
      } catch (error: unknown) {
         return handleGrpcError(error);
      }
   }

   async getSuppliersByIngredient(
      ingredientId: string,
      inStockOnly: boolean = false,
      correlationId?: string,
   ): Promise<IngredientSuppliersResponseDto> {
      try {
         const metadata = createGrpcMetadata({
            correlationId,
            callerService: SERVICE_NAMES.GATEWAY,
         });

         return await this.commerceGrpcBreaker.execute(async () => {
            const res = await firstValueFrom(
               defer(() =>
                  this.commerceGrpcService.getSuppliersByIngredient({ ingredientId, inStockOnly }, metadata),
               ).pipe(withGrpcRetry(this.commerceGrpcRetryPolicy)),
            );

            return {
               ingredientId: res.ingredientId,
               ingredientName: res.ingredientName,
               offers: res.offers.map((offer) => ({
                  productId: offer.productId,
                  supplierId: offer.supplierId,
                  ingredientId: offer.ingredientId,
                  productSku: offer.productSku,
                  productTitle: offer.productTitle,
                  price: offer.price,
                  currency: offer.currency,
                  originalPrice: offer.originalPrice || undefined,
                  packageSize: offer.packageSize || undefined,
                  stockQuantity: offer.stockQuantity,
                  inStock: offer.inStock,
                  productUrl: offer.productUrl || undefined,
                  productImageUrl: offer.productImageUrl || undefined,
                  offerStatus: offer.offerStatus,
                  supplier: offer.supplier ? this.mapProtoToSupplierDto(offer.supplier) : undefined,
               })),
               totalOffers: res.totalOffers,
            };
         });
      } catch (error: unknown) {
         return handleGrpcError(error);
      }
   }

   async listCategories(correlationId?: string): Promise<CategoryItemDto[]> {
      try {
         const metadata = createGrpcMetadata({
            correlationId,
            callerService: SERVICE_NAMES.GATEWAY,
         });

         return await this.commerceGrpcBreaker.execute(async () => {
            const res = await firstValueFrom(
               defer(() => this.commerceGrpcService.listCategories({}, metadata)).pipe(
                  withGrpcRetry(this.commerceGrpcRetryPolicy),
               ),
            );

            return res.categories.map((c) => ({
               categoryId: c.categoryId,
               categoryName: c.categoryName,
               categorySlug: c.categorySlug,
               iconUrl: c.iconUrl || undefined,
            }));
         });
      } catch (error: unknown) {
         return handleGrpcError(error);
      }
   }

   async createIngredient(dto: CreateIngredientDto, correlationId?: string): Promise<IngredientItemDto> {
      try {
         const metadata = createGrpcMetadata({
            correlationId,
            callerService: SERVICE_NAMES.GATEWAY,
         });

         return await this.commerceGrpcBreaker.execute(async () => {
            const res = await firstValueFrom(
               defer(() =>
                  this.commerceGrpcService.createIngredient(
                     {
                        ingredientName: dto.ingredientName,
                        ingredientDescription: dto.ingredientDescription,
                        categoryId: dto.categoryId,
                        defaultUnit: dto.defaultUnit,
                        ingredientImageUrl: dto.ingredientImageUrl,
                     },
                     metadata,
                  ),
               ).pipe(withGrpcRetry(this.commerceGrpcRetryPolicy)),
            );

            const ing = res.ingredient;
            return {
               ingredientId: ing.ingredientId,
               ingredientName: ing.ingredientName,
               normalizedName: ing.normalizedName,
               ingredientSlug: ing.ingredientSlug,
               ingredientDescription: ing.ingredientDescription,
               ingredientImageUrl: ing.ingredientImageUrl,
               categoryId: ing.categoryId,
               categoryName: ing.categoryName,
               defaultUnit: ing.defaultUnit,
               ingredientStatus: ing.ingredientStatus,
               supplierCount: ing.supplierCount,
               minPrice: ing.minPrice,
               maxPrice: ing.maxPrice,
               currency: ing.currency,
            };
         });
      } catch (error: unknown) {
         return handleGrpcError(error);
      }
   }

   async createProductOffer(dto: CreateProductOfferDto, correlationId?: string): Promise<SupplierProductOfferDto> {
      try {
         const metadata = createGrpcMetadata({
            correlationId,
            callerService: SERVICE_NAMES.GATEWAY,
         });

         return await this.commerceGrpcBreaker.execute(async () => {
            const res = await firstValueFrom(
               defer(() =>
                  this.commerceGrpcService.createSupplierProduct(
                     {
                        supplierId: dto.supplierId,
                        ingredientId: dto.ingredientId,
                        productSku: dto.productSku,
                        productTitle: dto.productTitle,
                        price: dto.price,
                        currency: dto.currency,
                        originalPrice: dto.originalPrice,
                        packageSize: dto.packageSize,
                        stockQuantity: dto.stockQuantity,
                        productUrl: dto.productUrl,
                        productImageUrl: dto.productImageUrl,
                     },
                     metadata,
                  ),
               ).pipe(withGrpcRetry(this.commerceGrpcRetryPolicy)),
            );

            const offer = res.product;
            return {
               productId: offer.productId,
               supplierId: offer.supplierId,
               ingredientId: offer.ingredientId,
               productSku: offer.productSku,
               productTitle: offer.productTitle,
               price: offer.price,
               currency: offer.currency,
               originalPrice: offer.originalPrice || undefined,
               packageSize: offer.packageSize || undefined,
               stockQuantity: offer.stockQuantity,
               inStock: offer.inStock,
               productUrl: offer.productUrl || undefined,
               productImageUrl: offer.productImageUrl || undefined,
               offerStatus: offer.offerStatus,
               supplier: offer.supplier ? this.mapProtoToSupplierDto(offer.supplier) : undefined,
            };
         });
      } catch (error: unknown) {
         return handleGrpcError(error);
      }
   }

   async checkGrpcHealth(): Promise<IHealthCheckResponse> {
      try {
         const healthService = this.commerceGrpcClient.getService<IHealthGrpcService>(HEALTH_GRPC_SERVICE_NAME);
         return await firstValueFrom(healthService.check({ service: COMMERCE_V1_GRPC_SERVICE_NAME }));
      } catch (error) {
         return handleGrpcError(error);
      }
   }
}
