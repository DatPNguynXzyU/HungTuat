import { Command } from '@common';
import type { UserEmailResponseDto } from '@contracts/auth';

export class GetEmailCommand extends Command<UserEmailResponseDto> {
   constructor(public readonly accountId: string) {
      super();
   }
}
