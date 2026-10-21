import type { Observable } from 'rxjs';
import type { Metadata } from '@grpc/grpc-js';
import type {
   ICreateIngredientRequest,
   ICreateIngredientResponse,
   ICreateSupplierProductRequest,
   ICreateSupplierProductResponse,
   IGetIngredientByIdRequest,
   IGetIngredientByIdResponse,
   IGetSuppliersByIngredientRequest,
   IGetSuppliersByIngredientResponse,
   IListCategoriesRequest,
   IListCategoriesResponse,
   IValidateIngredientsRequest,
   IValidateIngredientsResponse,
} from '@contracts/commerce/grpc/v1/messages';

export interface ICommerceV1GrpcService {
   getIngredientById(request: IGetIngredientByIdRequest, metadata?: Metadata): Observable<IGetIngredientByIdResponse>;

   getSuppliersByIngredient(
      request: IGetSuppliersByIngredientRequest,
      metadata?: Metadata,
   ): Observable<IGetSuppliersByIngredientResponse>;

   validateIngredients(
      request: IValidateIngredientsRequest,
      metadata?: Metadata,
   ): Observable<IValidateIngredientsResponse>;

   listCategories(request: IListCategoriesRequest, metadata?: Metadata): Observable<IListCategoriesResponse>;

   createIngredient(request: ICreateIngredientRequest, metadata?: Metadata): Observable<ICreateIngredientResponse>;

   createSupplierProduct(
      request: ICreateSupplierProductRequest,
      metadata?: Metadata,
   ): Observable<ICreateSupplierProductResponse>;
}

// Alias for active version
export type ICommerceGrpcService = ICommerceV1GrpcService;
