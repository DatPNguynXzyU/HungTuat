import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import { AuthRegistrationService } from '@auth/services/domain';
import { CheckEmailCommand } from '@auth/commands/registration/check-email.command';

@Injectable()
@CommandHandler(CheckEmailCommand)
export class CheckEmailHandler implements ICommandHandler<CheckEmailCommand, { available: boolean; email: string }> {
   constructor(private readonly authRegistrationService: AuthRegistrationService) {}

   async execute(command: CheckEmailCommand): Promise<{ available: boolean; email: string }> {
      return this.authRegistrationService.checkEmail(command.email);
   }
}
