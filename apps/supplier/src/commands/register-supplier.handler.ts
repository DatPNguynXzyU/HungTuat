import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import type { SupplierItemDto, SupplierStatusType } from '@contracts/supplier';
import { SupplierService } from '@supplier/services/supplier.service';
import { RegisterSupplierCommand } from '@supplier/commands/register-supplier.command';

@Injectable()
@CommandHandler(RegisterSupplierCommand)
export class RegisterSupplierHandler implements ICommandHandler<RegisterSupplierCommand, SupplierItemDto> {
   constructor(private readonly supplierService: SupplierService) {}

   async execute(command: RegisterSupplierCommand): Promise<SupplierItemDto> {
      const created = await this.supplierService.registerSupplier(command.dto);
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
         supplierStatus: created.supplierStatus as SupplierStatusType,
         supplierLogoUrl: created.supplierLogoUrl || undefined,
      };
   }
}
