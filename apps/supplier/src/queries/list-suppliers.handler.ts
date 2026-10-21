import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import type { ListSuppliersResponseDto, SupplierStatusType } from '@contracts/supplier';
import { SupplierService } from '@supplier/services/supplier.service';
import { ListSuppliersQuery } from '@supplier/queries/list-suppliers.query';

@Injectable()
@CommandHandler(ListSuppliersQuery)
export class ListSuppliersHandler implements ICommandHandler<ListSuppliersQuery, ListSuppliersResponseDto> {
   constructor(private readonly supplierService: SupplierService) {}

   async execute(query: ListSuppliersQuery): Promise<ListSuppliersResponseDto> {
      const { items, total } = await this.supplierService.listSuppliers({
         status: query.dto.status,
         city: query.dto.city,
         limit: query.dto.limit,
         offset: query.dto.offset,
      });

      return {
         items: items.map((s) => ({
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
         })),
         total,
         limit: query.dto.limit ?? 20,
         offset: query.dto.offset ?? 0,
      };
   }
}
