import { Controller, Inject, UseFilters, UseInterceptors } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import type { Metadata } from '@grpc/grpc-js';
import { from, type Observable } from 'rxjs';
import {
   checkRoles,
   COMMON_ERROR_CODES,
   CommandBus,
   DEFAULT_ROLES,
   extractGrpcUser,
   ForbiddenException,
   GrpcExceptionFilter,
   GrpcLoggingInterceptor,
   GrpcMetricsInterceptor,
   isActorAdmin,
   UnauthorizedException,
} from '@common';
import {
   COMMERCE_V1_GRPC_METHODS,
   COMMERCE_V1_GRPC_SERVICE_NAME,
   CurrencyEnum,
   isValidCurrency,
   type ICategoryProto,
   type ICommerceV1GrpcService,
   type ICreateIngredientRequest,
   type ICreateIngredientResponse,
   type ICreateSupplierProductRequest,
   type ICreateSupplierProductResponse,
   type IGetIngredientByIdRequest,
   type IGetIngredientByIdResponse,
   type IGetSuppliersByIngredientRequest,
   type IGetSuppliersByIngredientResponse,
   type IIngredientProto,
   type IListCategoriesRequest,
   type IListCategoriesResponse,
   type ISupplierProductProto,
   type ISupplierProto,
   type IValidateIngredientsRequest,
   type IValidateIngredientsResponse,
   type IngredientItemDto,
   type SupplierProductOfferDto,
} from '@contracts/commerce';
import type { SupplierItemDto } from '@contracts/supplier';
import { GetIngredientDetailQuery, GetSuppliersByIngredientQuery, ListCategoriesQuery } from '@commerce/queries';
import { CreateIngredientCommand, CreateProductOfferCommand, ValidateIngredientsCommand } from '@commerce/commands';
import { SUPPLIER_ADAPTER, type ISupplierAdapter } from '@commerce/adapters/supplier';

@Controller()
@UseFilters(new GrpcExceptionFilter())
@UseInterceptors(GrpcLoggingInterceptor, GrpcMetricsInterceptor)
export class CommerceGrpcController implements ICommerceV1GrpcService {
   constructor(
      private readonly commandBus: CommandBus,
      @Inject(SUPPLIER_ADAPTER)
      private readonly supplierAdapter: ISupplierAdapter,
   ) {}

   private mapIngredientToProto(item: IngredientItemDto): IIngredientProto {
      return {
         ingredientId: item.ingredientId,
         ingredientName: item.ingredientName,
         normalizedName: item.normalizedName,
         ingredientSlug: item.ingredientSlug,
         ingredientDescription: item.ingredientDescription,
         ingredientImageUrl: item.ingredientImageUrl,
         categoryId: item.categoryId,
         categoryName: item.categoryName,
         defaultUnit: item.defaultUnit,
         ingredientStatus: item.ingredientStatus,
         supplierCount: item.supplierCount,
         minPrice: item.minPrice,
         maxPrice: item.maxPrice,
         currency: item.currency,
      };
   }

   private mapSupplierToProto(supplier: SupplierItemDto): ISupplierProto {
      return {
         supplierId: supplier.supplierId,
         supplierName: supplier.supplierName,
         supplierSlug: supplier.supplierSlug,
         supplierCode: supplier.supplierCode,
         contactEmail: supplier.contactEmail || '',
         contactPhone: supplier.contactPhone || '',
         address: supplier.address || '',
         city: supplier.city || '',
         rating: supplier.rating,
         isVerified: supplier.isVerified,
         supplierStatus: supplier.supplierStatus,
         supplierLogoUrl: supplier.supplierLogoUrl || '',
      };
   }

   private mapOfferToProto(offer: SupplierProductOfferDto): ISupplierProductProto {
      return {
         productId: offer.productId,
         supplierId: offer.supplierId,
         ingredientId: offer.ingredientId,
         productSku: offer.productSku,
         productTitle: offer.productTitle,
         price: offer.price,
         currency: offer.currency,
         originalPrice: offer.originalPrice || 0,
         packageSize: offer.packageSize || '',
         stockQuantity: offer.stockQuantity,
         inStock: offer.inStock,
         productUrl: offer.productUrl || '',
         productImageUrl: offer.productImageUrl || '',
         offerStatus: offer.offerStatus,
         supplier: offer.supplier ? this.mapSupplierToProto(offer.supplier) : undefined,
      };
   }

   @GrpcMethod(COMMERCE_V1_GRPC_SERVICE_NAME, COMMERCE_V1_GRPC_METHODS.GET_INGREDIENT_BY_ID)
   getIngredientById(data: IGetIngredientByIdRequest): Observable<IGetIngredientByIdResponse> {
      return from(
         this.commandBus.execute(new GetIngredientDetailQuery(data.ingredientId)).then((result) => ({
            ingredient: this.mapIngredientToProto(result.ingredient),
            offers: result.offers.map((offer) => this.mapOfferToProto(offer)),
         })),
      );
   }

   @GrpcMethod(COMMERCE_V1_GRPC_SERVICE_NAME, COMMERCE_V1_GRPC_METHODS.GET_SUPPLIERS_BY_INGREDIENT)
   getSuppliersByIngredient(data: IGetSuppliersByIngredientRequest): Observable<IGetSuppliersByIngredientResponse> {
      return from(
         this.commandBus
            .execute(new GetSuppliersByIngredientQuery(data.ingredientId, data.inStockOnly))
            .then((result) => ({
               ingredientId: result.ingredientId,
               ingredientName: result.ingredientName,
               offers: result.offers.map((offer) => this.mapOfferToProto(offer)),
               totalOffers: result.totalOffers,
            })),
      );
   }

   @GrpcMethod(COMMERCE_V1_GRPC_SERVICE_NAME, COMMERCE_V1_GRPC_METHODS.VALIDATE_INGREDIENTS)
   validateIngredients(data: IValidateIngredientsRequest): Observable<IValidateIngredientsResponse> {
      return from(
         this.commandBus.execute(new ValidateIngredientsCommand(data.ingredientIds)).then((result) => ({
            items: result.items.map((item) => ({
               ingredientId: item.ingredientId,
               ingredientName: item.ingredientName,
               defaultUnit: item.defaultUnit,
               exists: item.exists,
               hasSuppliers: item.hasSuppliers,
            })),
            allValid: result.allValid,
         })),
      );
   }

   @GrpcMethod(COMMERCE_V1_GRPC_SERVICE_NAME, COMMERCE_V1_GRPC_METHODS.LIST_CATEGORIES)
   listCategories(_data: IListCategoriesRequest): Observable<IListCategoriesResponse> {
      return from(
         this.commandBus.execute(new ListCategoriesQuery()).then((categories) => ({
            categories: categories.map((c): ICategoryProto => ({
               categoryId: c.categoryId,
               categoryName: c.categoryName,
               categorySlug: c.categorySlug,
               iconUrl: c.iconUrl || '',
            })),
         })),
      );
   }

   @GrpcMethod(COMMERCE_V1_GRPC_SERVICE_NAME, COMMERCE_V1_GRPC_METHODS.CREATE_INGREDIENT)
   createIngredient(data: ICreateIngredientRequest, metadata?: Metadata): Observable<ICreateIngredientResponse> {
      checkRoles(metadata, [DEFAULT_ROLES.ADMIN]);

      return from(
         this.commandBus
            .execute(
               new CreateIngredientCommand({
                  ingredientName: data.ingredientName,
                  ingredientDescription: data.ingredientDescription,
                  categoryId: data.categoryId,
                  defaultUnit: data.defaultUnit,
                  ingredientImageUrl: data.ingredientImageUrl,
               }),
            )
            .then((ingredient) => ({
               ingredient: this.mapIngredientToProto(ingredient),
            })),
      );
   }

   @GrpcMethod(COMMERCE_V1_GRPC_SERVICE_NAME, COMMERCE_V1_GRPC_METHODS.CREATE_SUPPLIER_PRODUCT)
   createSupplierProduct(
      data: ICreateSupplierProductRequest,
      metadata?: Metadata,
   ): Observable<ICreateSupplierProductResponse> {
      const currency = isValidCurrency(data.currency ?? '') ? (data.currency as CurrencyEnum) : CurrencyEnum.VND;

      return from(
         (async () => {
            if (!isActorAdmin(metadata)) {
               const user = extractGrpcUser(metadata);
               if (!user) {
                  throw new UnauthorizedException(COMMON_ERROR_CODES.MISSING_USER_CONTEXT);
               }
               const mySupplier = await this.supplierAdapter.getMySupplier(user.userId);
               if (!mySupplier.hasSupplier || mySupplier.supplierId !== data.supplierId) {
                  throw new ForbiddenException(COMMON_ERROR_CODES.NOT_OWNER_OR_ADMIN);
               }
            }

            const product = await this.commandBus.execute(
               new CreateProductOfferCommand({
                  supplierId: data.supplierId,
                  ingredientId: data.ingredientId,
                  productSku: data.productSku,
                  productTitle: data.productTitle,
                  price: data.price,
                  currency,
                  originalPrice: data.originalPrice,
                  packageSize: data.packageSize,
                  stockQuantity: data.stockQuantity,
                  productUrl: data.productUrl,
                  productImageUrl: data.productImageUrl,
               }),
            );

            return {
               product: this.mapOfferToProto(product),
            };
         })(),
      );
   }
}
