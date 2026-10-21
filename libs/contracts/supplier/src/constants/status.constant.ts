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

export const SUPPLIER_MEMBER_STATUS = {
   ACTIVE: 'ACTIVE',
   INVITED: 'INVITED',
   SUSPENDED: 'SUSPENDED',
} as const;

export type SupplierMemberStatusType = (typeof SUPPLIER_MEMBER_STATUS)[keyof typeof SUPPLIER_MEMBER_STATUS];
