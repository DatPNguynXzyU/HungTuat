import type { CreateSupplierData, SupplierEntity, UpdateSupplierData } from '@supplier/entities';

export const SUPPLIER_REPOSITORY = Symbol('SUPPLIER_REPOSITORY');

export interface FindSuppliersParams {
   status?: string;
   city?: string;
   limit?: number;
   offset?: number;
}

export interface ISupplierRepository {
   findById(supplierId: string): Promise<SupplierEntity | null>;
   findByIds(supplierIds: string[]): Promise<SupplierEntity[]>;
   findBySlug(slug: string): Promise<SupplierEntity | null>;
   findByCode(code: string): Promise<SupplierEntity | null>;
   findMany(params: FindSuppliersParams): Promise<{ items: SupplierEntity[]; total: number }>;
   create(data: CreateSupplierData): Promise<SupplierEntity>;
   update(supplierId: string, data: UpdateSupplierData): Promise<SupplierEntity | null>;
   softDelete(supplierId: string): Promise<boolean>;
}
