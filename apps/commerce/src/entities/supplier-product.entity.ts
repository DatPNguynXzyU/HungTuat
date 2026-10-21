import type { SupplierEntity } from '@commerce/entities/supplier.entity';
import type { IngredientEntity } from '@commerce/entities/ingredient.entity';
import { CurrencyEnum } from '@contracts/commerce';

export interface SupplierProductEntity {
   productId: string;
   supplierId: string;
   ingredientId: string;
   productSku: string;
   productTitle: string;
   price: number;
   currency: CurrencyEnum;
   originalPrice?: number | null;
   packageSize?: string | null;
   stockQuantity: number;
   productUrl?: string | null;
   productImageUrl?: string | null;
   offerStatus: string;
   version?: number;
   deletedAt?: Date | null;
   createdAt: Date;
   updatedAt: Date;
   supplier?: SupplierEntity;
   ingredient?: IngredientEntity;
}

export interface CreateSupplierProductData {
   supplierId: string;
   ingredientId: string;
   productSku: string;
   productTitle: string;
   price: number;
   currency: CurrencyEnum;
   originalPrice?: number | null;
   packageSize?: string | null;
   stockQuantity?: number;
   productUrl?: string | null;
   productImageUrl?: string | null;
   offerStatus?: string;
}

export interface UpdateSupplierProductData {
   productTitle?: string;
   price?: number;
   currency: CurrencyEnum;
   originalPrice?: number | null;
   packageSize?: string | null;
   stockQuantity?: number;
   productUrl?: string | null;
   productImageUrl?: string | null;
   offerStatus?: string;
}
