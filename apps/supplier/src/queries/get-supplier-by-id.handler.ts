import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import type { SupplierItemDto, SupplierStatusType } from '@contracts/supplier';
import { SupplierService } from '@supplier/services/supplier.service';
import { GetSupplierByIdQuery } from '@supplier/queries/get-supplier-by-id.query';

@Injectable()
@CommandHandler(GetSupplierByIdQuery)
export class GetSupplierByIdHandler implements ICommandHandler<GetSupplierByIdQuery, SupplierItemDto> {
   constructor(private readonly supplierService: SupplierService) {}

   async execute(query: GetSupplierByIdQuery): Promise<SupplierItemDto> {
      const supplier = await this.supplierService.getSupplierById(query.supplierId);
      return {
         supplierId: supplier.supplierId,
         supplierName: supplier.supplierName,
         supplierSlug: supplier.supplierSlug,
         supplierCode: supplier.supplierCode,
         contactEmail: supplier.contactEmail || undefined,
         contactPhone: supplier.contactPhone || undefined,
         address: supplier.address || undefined,
         city: supplier.city || undefined,
         rating: supplier.rating,
         isVerified: supplier.isVerified,
         supplierStatus: supplier.supplierStatus as SupplierStatusType,
         supplierLogoUrl: supplier.supplierLogoUrl || undefined,
      };
   }
}
