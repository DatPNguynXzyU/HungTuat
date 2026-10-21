import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import type { SupplierItemDto, SupplierStatusType } from '@contracts/supplier';
import { SupplierService } from '@supplier/services/supplier.service';
import { UpdateSupplierCommand } from '@supplier/commands/update-supplier.command';

@Injectable()
@CommandHandler(UpdateSupplierCommand)
export class UpdateSupplierHandler implements ICommandHandler<UpdateSupplierCommand, SupplierItemDto> {
   constructor(private readonly supplierService: SupplierService) {}

   async execute(command: UpdateSupplierCommand): Promise<SupplierItemDto> {
      const updated = await this.supplierService.updateSupplier(command.supplierId, command.dto);
      return {
         supplierId: updated.supplierId,
         supplierName: updated.supplierName,
         supplierSlug: updated.supplierSlug,
         supplierCode: updated.supplierCode,
         contactEmail: updated.contactEmail || undefined,
         contactPhone: updated.contactPhone || undefined,
         address: updated.address || undefined,
         city: updated.city || undefined,
         rating: updated.rating,
         isVerified: updated.isVerified,
         supplierStatus: updated.supplierStatus as SupplierStatusType,
         supplierLogoUrl: updated.supplierLogoUrl || undefined,
      };
   }
}
