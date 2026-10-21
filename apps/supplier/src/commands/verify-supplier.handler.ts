import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import type { SupplierItemDto, SupplierStatusType } from '@contracts/supplier';
import { SupplierService } from '@supplier/services/supplier.service';
import { VerifySupplierCommand } from '@supplier/commands/verify-supplier.command';

@Injectable()
@CommandHandler(VerifySupplierCommand)
export class VerifySupplierHandler implements ICommandHandler<VerifySupplierCommand, SupplierItemDto> {
   constructor(private readonly supplierService: SupplierService) {}

   async execute(command: VerifySupplierCommand): Promise<SupplierItemDto> {
      const updated = await this.supplierService.verifySupplier(command.supplierId, command.isVerified);
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
