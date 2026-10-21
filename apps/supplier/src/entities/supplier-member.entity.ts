export interface SupplierMemberEntity {
   memberId: string;
   supplierId?: string | null;
   accountId: string;
   email: string;
   role: string;
   memberStatus: string;
   joinedAt?: Date | null;
   createdAt: Date;
   updatedAt: Date;
   deletedAt?: Date | null;
}

export interface CreateSupplierMemberData {
   supplierId?: string | null;
   accountId: string;
   email: string;
   role?: string;
   memberStatus?: string;
   joinedAt?: Date | null;
}

export interface UpdateSupplierMemberData {
   supplierId?: string | null;
   role?: string;
   memberStatus?: string;
   joinedAt?: Date | null;
}
