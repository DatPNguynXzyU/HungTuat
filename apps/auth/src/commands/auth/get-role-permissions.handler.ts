import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import { AuthCoreService } from '@auth/services/domain';
import { GetRolePermissionsCommand } from '@auth/commands/auth/get-role-permissions.command';

@Injectable()
@CommandHandler(GetRolePermissionsCommand)
export class GetRolePermissionsHandler implements ICommandHandler<GetRolePermissionsCommand, string[]> {
   constructor(private readonly authCoreService: AuthCoreService) {}

   async execute(command: GetRolePermissionsCommand): Promise<string[]> {
      return this.authCoreService.getRolePermissions(command.roleCode);
   }
}
