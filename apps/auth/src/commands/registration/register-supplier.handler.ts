import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import type { IAuthResult } from '@contracts/auth';
import { AuthRegistrationService } from '@auth/services/domain';
import { RegisterSupplierCommand } from '@auth/commands/registration/register-supplier.command';

@Injectable()
@CommandHandler(RegisterSupplierCommand)
export class RegisterSupplierHandler implements ICommandHandler<RegisterSupplierCommand, IAuthResult> {
   constructor(private readonly authRegistrationService: AuthRegistrationService) {}

   async execute(command: RegisterSupplierCommand): Promise<IAuthResult> {
      return this.authRegistrationService.registerSupplier(command.data, command.deviceInfo);
   }
}
