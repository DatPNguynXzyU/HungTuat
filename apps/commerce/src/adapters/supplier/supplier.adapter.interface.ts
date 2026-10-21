import type { RegisterSupplierDto, SupplierItemDto } from '@contracts/supplier';

export const SUPPLIER_ADAPTER = Symbol('SUPPLIER_ADAPTER');

export interface ISupplierAdapter {
   getSupplierById(supplierId: string): Promise<SupplierItemDto | null>;
   getSuppliersByIds(supplierIds: string[]): Promise<Map<string, SupplierItemDto>>;
   registerSupplier(data: RegisterSupplierDto): Promise<SupplierItemDto>;
}
