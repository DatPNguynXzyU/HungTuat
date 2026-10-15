import { Command } from '@common';
import type { UserDateOfBirthResponseDto } from '@contracts/user';

export class GetDateOfBirthCommand extends Command<UserDateOfBirthResponseDto> {
   constructor(public readonly userId: string) {
      super();
   }
}
