export interface ISupplierProto {
   supplierId: string;
   supplierName: string;
   supplierSlug: string;
   supplierCode: string;
   contactEmail?: string;
   contactPhone?: string;
   address?: string;
   city?: string;
   rating: number;
   isVerified: boolean;
   supplierStatus: string;
   supplierLogoUrl?: string;
   version?: number;
   createdAt?: string;
   updatedAt?: string;
}
