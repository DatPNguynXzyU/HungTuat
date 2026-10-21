import { RegisterSupplierHandler } from '@supplier/commands/register-supplier.handler';
import { UpdateSupplierHandler } from '@supplier/commands/update-supplier.handler';
import { VerifySupplierHandler } from '@supplier/commands/verify-supplier.handler';

export * from '@supplier/commands/register-supplier.command';
export * from '@supplier/commands/register-supplier.handler';
export * from '@supplier/commands/update-supplier.command';
export * from '@supplier/commands/update-supplier.handler';
export * from '@supplier/commands/verify-supplier.command';
export * from '@supplier/commands/verify-supplier.handler';

export const SUPPLIER_COMMAND_HANDLERS = [RegisterSupplierHandler, UpdateSupplierHandler, VerifySupplierHandler];
