import { Inject, Injectable, Logger } from '@nestjs/common';
import { CommandHandler, DEFAULT_ROLES, type ICommandHandler } from '@common';
import { SUPPLIER_MEMBER_STATUS } from '@contracts/supplier';
import type { SupplierMemberEntity } from '@supplier/entities';
import { SUPPLIER_MEMBER_REPOSITORY, type ISupplierMemberRepository } from '@supplier/repositories';
import { HandleSupplierRegisteredCommand } from '@supplier/commands/handle-supplier-registered.command';

@Injectable()
@CommandHandler(HandleSupplierRegisteredCommand)
export class HandleSupplierRegisteredHandler implements ICommandHandler<
   HandleSupplierRegisteredCommand,
   SupplierMemberEntity | null
> {
   private readonly logger = new Logger(HandleSupplierRegisteredHandler.name);

   constructor(
      @Inject(SUPPLIER_MEMBER_REPOSITORY)
      private readonly supplierMemberRepository: ISupplierMemberRepository,
   ) {}

   async execute(command: HandleSupplierRegisteredCommand): Promise<SupplierMemberEntity | null> {
      const { accountId, email, role } = command.data;
      if (!accountId || !email) {
         this.logger.warn(
            `Missing accountId or email in supplier registration payload: ${JSON.stringify(command.data)}`,
         );
         return null;
      }

      const existing = await this.supplierMemberRepository.findByAccountId(accountId);
      if (existing) {
         this.logger.log(`Supplier member already exists for accountId: ${accountId}`);
         return existing;
      }

      const resolvedRole = role ?? DEFAULT_ROLES.SUPPLIER_ADMIN;
      this.logger.log(`Provisioning supplier member for account ${accountId} (${email}) with role ${resolvedRole}`);
      return this.supplierMemberRepository.create({
         accountId,
         email,
         role: resolvedRole,
         memberStatus: SUPPLIER_MEMBER_STATUS.ACTIVE,
         joinedAt: new Date(),
      });
   }
}
