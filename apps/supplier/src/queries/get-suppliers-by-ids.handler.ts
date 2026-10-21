import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import type { SupplierItemDto, SupplierStatusType } from '@contracts/supplier';
import { SupplierService } from '@supplier/services/supplier.service';
import { GetSuppliersByIdsQuery } from '@supplier/queries/get-suppliers-by-ids.query';

@Injectable()
@CommandHandler(GetSuppliersByIdsQuery)
export class GetSuppliersByIdsHandler implements ICommandHandler<GetSuppliersByIdsQuery, SupplierItemDto[]> {
   constructor(private readonly supplierService: SupplierService) {}

   async execute(query: GetSuppliersByIdsQuery): Promise<SupplierItemDto[]> {
      const records = await this.supplierService.getSuppliersByIds(query.supplierIds);
      return records.map((s) => ({
         supplierId: s.supplierId,
         supplierName: s.supplierName,
         supplierSlug: s.supplierSlug,
         supplierCode: s.supplierCode,
         contactEmail: s.contactEmail || undefined,
         contactPhone: s.contactPhone || undefined,
         address: s.address || undefined,
         city: s.city || undefined,
         rating: s.rating,
         isVerified: s.isVerified,
         supplierStatus: s.supplierStatus as SupplierStatusType,
         supplierLogoUrl: s.supplierLogoUrl || undefined,
      }));
   }
}
