import { GetSupplierByIdHandler } from '@supplier/queries/get-supplier-by-id.handler';
import { GetSuppliersByIdsHandler } from '@supplier/queries/get-suppliers-by-ids.handler';
import { ListSuppliersHandler } from '@supplier/queries/list-suppliers.handler';
import { GetMySupplierHandler } from '@supplier/queries/get-my-supplier.handler';

export * from '@supplier/queries/get-supplier-by-id.query';
export * from '@supplier/queries/get-supplier-by-id.handler';
export * from '@supplier/queries/get-suppliers-by-ids.query';
export * from '@supplier/queries/get-suppliers-by-ids.handler';
export * from '@supplier/queries/list-suppliers.query';
export * from '@supplier/queries/list-suppliers.handler';
export * from '@supplier/queries/get-my-supplier.query';
export * from '@supplier/queries/get-my-supplier.handler';

export const SUPPLIER_QUERY_HANDLERS = [
   GetSupplierByIdHandler,
   GetSuppliersByIdsHandler,
   ListSuppliersHandler,
   GetMySupplierHandler,
];
