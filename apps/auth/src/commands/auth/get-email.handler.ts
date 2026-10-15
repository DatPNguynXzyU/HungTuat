import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import type { UserEmailResponseDto } from '@contracts/auth';
import { AuthCoreService } from '@auth/services/domain';
import { GetEmailCommand } from '@auth/commands/auth/get-email.command';

@Injectable()
@CommandHandler(GetEmailCommand)
export class GetEmailHandler implements ICommandHandler<GetEmailCommand, UserEmailResponseDto> {
   constructor(private readonly authCoreService: AuthCoreService) {}

   async execute(command: GetEmailCommand): Promise<UserEmailResponseDto> {
      return this.authCoreService.getEmail(command.accountId);
   }
}
