export interface SupplierEntity {
   supplierId: string;
   supplierName: string;
   supplierSlug: string;
   supplierCode: string;
   contactEmail?: string | null;
   contactPhone?: string | null;
   address?: string | null;
   city?: string | null;
   rating: number;
   isVerified: boolean;
   supplierStatus: string;
   supplierLogoUrl?: string | null;
   version?: number;
   deletedAt?: Date | null;
   createdAt: Date;
   updatedAt: Date;
}

export interface CreateSupplierData {
   supplierName: string;
   supplierSlug: string;
   supplierCode: string;
   contactEmail?: string | null;
   contactPhone?: string | null;
   address?: string | null;
   city?: string | null;
   rating?: number;
   isVerified?: boolean;
   supplierStatus?: string;
   supplierLogoUrl?: string | null;
}

export interface UpdateSupplierData {
   supplierName?: string;
   supplierSlug?: string;
   contactEmail?: string | null;
   contactPhone?: string | null;
   address?: string | null;
   city?: string | null;
   rating?: number;
   isVerified?: boolean;
   supplierStatus?: string;
   supplierLogoUrl?: string | null;
}
