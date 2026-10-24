import { Injectable, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import { AuthRbacService } from '@auth/services/domain/auth-rbac.service';
import { ElevateAccountRoleCommand } from '@auth/commands/auth/elevate-account-role.command';

@Injectable()
@CommandHandler(ElevateAccountRoleCommand)
export class ElevateAccountRoleHandler implements ICommandHandler<ElevateAccountRoleCommand, void> {
   private readonly logger = new Logger(ElevateAccountRoleHandler.name);

   constructor(private readonly authRbacService: AuthRbacService) {}

   async execute(command: ElevateAccountRoleCommand): Promise<void> {
      this.logger.log(`Elevating role for account ${command.accountId} to ${command.role}`);
      await this.authRbacService.assignRoleToAccount(command.accountId, command.role);
   }
}
