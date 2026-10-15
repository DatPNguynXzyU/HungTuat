import { Command } from '@common';
import type { IValidateTokenResult } from '@contracts/auth';

export class ValidateTokenCommand extends Command<IValidateTokenResult> {
   constructor(public readonly token: string) {
      super();
   }
}
