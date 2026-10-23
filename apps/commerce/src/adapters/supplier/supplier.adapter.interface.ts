import type { SupplierItemDto } from '@contracts/supplier';

export const SUPPLIER_ADAPTER = Symbol('SUPPLIER_ADAPTER');

export interface ISupplierAdapter {
   getSupplierById(supplierId: string): Promise<SupplierItemDto | null>;
   getSuppliersByIds(supplierIds: string[]): Promise<Map<string, SupplierItemDto>>;
   getMySupplier(accountId: string): Promise<{ hasSupplier: boolean; supplierId?: string }>;
}
