import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import type { SupplierItemDto } from '@contracts/commerce';
import { SupplierOfferService } from '@commerce/services';
import { RegisterSupplierCommand } from '@commerce/commands/register-supplier.command';

@Injectable()
@CommandHandler(RegisterSupplierCommand)
export class RegisterSupplierHandler implements ICommandHandler<RegisterSupplierCommand, SupplierItemDto> {
   constructor(private readonly supplierOfferService: SupplierOfferService) {}

   async execute(command: RegisterSupplierCommand): Promise<SupplierItemDto> {
      const created = await this.supplierOfferService.registerSupplier(command.dto);
      return {
         supplierId: created.supplierId,
         supplierName: created.supplierName,
         supplierSlug: created.supplierSlug,
         supplierCode: created.supplierCode,
         contactEmail: created.contactEmail || undefined,
         contactPhone: created.contactPhone || undefined,
         address: created.address || undefined,
         city: created.city || undefined,
         rating: created.rating,
         isVerified: created.isVerified,
         supplierStatus: created.supplierStatus,
         supplierLogoUrl: created.supplierLogoUrl || undefined,
      };
   }
}
