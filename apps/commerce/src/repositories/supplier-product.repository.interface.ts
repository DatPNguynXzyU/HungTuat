import type {
   CreateSupplierProductData,
   SupplierProductEntity,
   UpdateSupplierProductData,
} from '@commerce/entities/supplier-product.entity';

export const SUPPLIER_PRODUCT_REPOSITORY = Symbol('SUPPLIER_PRODUCT_REPOSITORY');

export interface ISupplierProductRepository {
   findById(productId: string): Promise<SupplierProductEntity | null>;
   findBySupplierAndSku(supplierId: string, sku: string): Promise<SupplierProductEntity | null>;
   findByIngredientId(ingredientId: string, inStockOnly?: boolean): Promise<SupplierProductEntity[]>;
   findBySupplierId(supplierId: string): Promise<SupplierProductEntity[]>;
   create(data: CreateSupplierProductData): Promise<SupplierProductEntity>;
   update(productId: string, data: UpdateSupplierProductData): Promise<SupplierProductEntity | null>;
   updateStock(productId: string, quantity: number): Promise<SupplierProductEntity | null>;
   softDelete(productId: string): Promise<boolean>;
}
