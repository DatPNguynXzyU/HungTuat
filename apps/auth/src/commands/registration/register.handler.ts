import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import type { IAuthResult } from '@contracts/auth';
import { AuthRegistrationService } from '@auth/services/domain';
import { RegisterCommand } from '@auth/commands/registration/register.command';

@Injectable()
@CommandHandler(RegisterCommand)
export class RegisterHandler implements ICommandHandler<RegisterCommand, IAuthResult> {
   constructor(private readonly authRegistrationService: AuthRegistrationService) {}

   async execute(command: RegisterCommand): Promise<IAuthResult> {
      return this.authRegistrationService.register(command.data, command.deviceInfo);
   }
}
