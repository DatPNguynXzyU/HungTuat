import type { CreateSupplierData, SupplierEntity, UpdateSupplierData } from '@commerce/entities/supplier.entity';

export const SUPPLIER_REPOSITORY = Symbol('SUPPLIER_REPOSITORY');

export interface ISupplierRepository {
   findById(supplierId: string): Promise<SupplierEntity | null>;
   findBySlug(slug: string): Promise<SupplierEntity | null>;
   findByCode(code: string): Promise<SupplierEntity | null>;
   findActive(): Promise<SupplierEntity[]>;
   create(data: CreateSupplierData): Promise<SupplierEntity>;
   update(supplierId: string, data: UpdateSupplierData): Promise<SupplierEntity | null>;
   softDelete(supplierId: string): Promise<boolean>;
}
