import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import type { IValidateTokenResult } from '@contracts/auth';
import { AuthCoreService } from '@auth/services/domain';
import { ValidateTokenCommand } from '@auth/commands/auth/validate-token.command';

@Injectable()
@CommandHandler(ValidateTokenCommand)
export class ValidateTokenHandler implements ICommandHandler<ValidateTokenCommand, IValidateTokenResult> {
   constructor(private readonly authCoreService: AuthCoreService) {}

   async execute(command: ValidateTokenCommand): Promise<IValidateTokenResult> {
      return this.authCoreService.validateToken(command.token);
   }
}
