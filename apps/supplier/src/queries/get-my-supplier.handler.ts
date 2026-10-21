import { Inject, Injectable, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import type { SupplierStatusType } from '@contracts/supplier';
import { SUPPLIER_MEMBER_REPOSITORY, type ISupplierMemberRepository } from '@supplier/repositories';
import { SupplierService } from '@supplier/services/supplier.service';
import { GetMySupplierQuery, type MySupplierQueryResult } from '@supplier/queries/get-my-supplier.query';

@Injectable()
@CommandHandler(GetMySupplierQuery)
export class GetMySupplierHandler implements ICommandHandler<GetMySupplierQuery, MySupplierQueryResult> {
   private readonly logger = new Logger(GetMySupplierHandler.name);

   constructor(
      @Inject(SUPPLIER_MEMBER_REPOSITORY)
      private readonly supplierMemberRepository: ISupplierMemberRepository,
      private readonly supplierService: SupplierService,
   ) {}

   async execute(query: GetMySupplierQuery): Promise<MySupplierQueryResult> {
      if (!query.accountId) {
         return {
            hasSupplier: false,
            supplier: null,
         };
      }

      const member = await this.supplierMemberRepository.findByAccountId(query.accountId);
      if (!member || !member.supplierId) {
         return {
            hasSupplier: false,
            supplier: null,
            role: member?.role,
            memberStatus: member?.memberStatus,
         };
      }

      try {
         const supplier = await this.supplierService.getSupplierById(member.supplierId);
         return {
            hasSupplier: true,
            supplier: {
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
            },
            role: member.role,
            memberStatus: member.memberStatus,
         };
      } catch (err) {
         this.logger.warn(`Could not find supplier ${member.supplierId} for member ${member.memberId}`, err);
         return {
            hasSupplier: false,
            supplier: null,
            role: member.role,
            memberStatus: member.memberStatus,
         };
      }
   }
}
