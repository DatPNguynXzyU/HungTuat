import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import { AuthCoreService } from '@auth/services/domain';
import { RegisterServicePermissionsCommand } from '@auth/commands/auth/register-service-permissions.command';

@Injectable()
@CommandHandler(RegisterServicePermissionsCommand)
export class RegisterServicePermissionsHandler implements ICommandHandler<RegisterServicePermissionsCommand, number> {
   constructor(private readonly authCoreService: AuthCoreService) {}

   async execute(command: RegisterServicePermissionsCommand): Promise<number> {
      return this.authCoreService.registerServicePermissions(command.serviceName, command.permissions);
   }
}
