export interface ICategoryProto {
   categoryId: string;
   categoryName: string;
   categorySlug: string;
   iconUrl?: string;
}

export interface IIngredientProto {
   ingredientId: string;
   ingredientName: string;
   normalizedName: string;
   ingredientSlug: string;
   ingredientDescription: string;
   ingredientImageUrl: string;
   categoryId: string;
   categoryName: string;
   defaultUnit: string;
   ingredientStatus: string;
   supplierCount: number;
   minPrice: number;
   maxPrice: number;
   currency: string;
}

export interface ISupplierProto {
   supplierId: string;
   supplierName: string;
   supplierSlug: string;
   supplierCode: string;
   contactEmail?: string;
   contactPhone?: string;
   address?: string;
   city?: string;
   rating: number;
   isVerified: boolean;
   supplierStatus: string;
   supplierLogoUrl?: string;
}

export interface ISupplierProductProto {
   productId: string;
   supplierId: string;
   ingredientId: string;
   productSku: string;
   productTitle: string;
   price: number;
   currency: string;
   originalPrice?: number;
   packageSize?: string;
   stockQuantity: number;
   inStock: boolean;
   productUrl?: string;
   productImageUrl?: string;
   offerStatus: string;
   supplier?: ISupplierProto;
}
