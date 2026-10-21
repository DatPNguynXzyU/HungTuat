export const SUPPLIER_STATUS = {
   ACTIVE: 'ACTIVE',
   PENDING: 'PENDING',
   SUSPENDED: 'SUSPENDED',
} as const;

export type SupplierStatusType = (typeof SUPPLIER_STATUS)[keyof typeof SUPPLIER_STATUS];

export enum SupplierStatusEnum {
   ACTIVE = 'ACTIVE',
   PENDING = 'PENDING',
   SUSPENDED = 'SUSPENDED',
}
