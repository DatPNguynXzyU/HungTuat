import type {
   ICategoryProto,
   IIngredientProto,
   ISupplierProductProto,
   ISupplierProto,
} from '@contracts/commerce/grpc/v1/models';

export interface IGetIngredientByIdRequest {
   ingredientId: string;
}

export interface IGetIngredientByIdResponse {
   ingredient?: IIngredientProto;
   offers: ISupplierProductProto[];
}

export interface IGetSuppliersByIngredientRequest {
   ingredientId: string;
   inStockOnly?: boolean;
}

export interface IGetSuppliersByIngredientResponse {
   ingredientId: string;
   ingredientName: string;
   offers: ISupplierProductProto[];
   totalOffers: number;
}

export interface IValidateIngredientsRequest {
   ingredientIds: string[];
}

export interface IValidatedIngredientItem {
   ingredientId: string;
   ingredientName: string;
   defaultUnit: string;
   exists: boolean;
   hasSuppliers: boolean;
}

export interface IValidateIngredientsResponse {
   items: IValidatedIngredientItem[];
   allValid: boolean;
}

export type IListCategoriesRequest = Record<string, never>;

export interface IListCategoriesResponse {
   categories: ICategoryProto[];
}

export interface ICreateIngredientRequest {
   ingredientName: string;
   ingredientDescription: string;
   categoryId: string;
   defaultUnit: string;
   ingredientImageUrl: string;
}

export interface ICreateIngredientResponse {
   ingredient: IIngredientProto;
}

export interface IRegisterSupplierRequest {
   supplierName: string;
   supplierCode: string;
   contactEmail?: string;
   contactPhone?: string;
   address?: string;
   city?: string;
   supplierLogoUrl?: string;
}

export interface IRegisterSupplierResponse {
   supplier: ISupplierProto;
}

export interface ICreateSupplierProductRequest {
   supplierId: string;
   ingredientId: string;
   productSku: string;
   productTitle: string;
   price: number;
   currency?: string;
   originalPrice?: number;
   packageSize?: string;
   stockQuantity?: number;
   productUrl?: string;
   productImageUrl?: string;
}

export interface ICreateSupplierProductResponse {
   product: ISupplierProductProto;
}
