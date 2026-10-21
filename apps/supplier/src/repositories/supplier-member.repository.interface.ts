import type { CreateSupplierMemberData, SupplierMemberEntity, UpdateSupplierMemberData } from '@supplier/entities';

export const SUPPLIER_MEMBER_REPOSITORY = Symbol('SUPPLIER_MEMBER_REPOSITORY');

export interface ISupplierMemberRepository {
   findById(memberId: string): Promise<SupplierMemberEntity | null>;
   findByAccountId(accountId: string): Promise<SupplierMemberEntity | null>;
   findBySupplierId(supplierId: string): Promise<SupplierMemberEntity[]>;
   create(data: CreateSupplierMemberData): Promise<SupplierMemberEntity>;
   update(memberId: string, data: UpdateSupplierMemberData): Promise<SupplierMemberEntity | null>;
   softDelete(memberId: string): Promise<boolean>;
}
