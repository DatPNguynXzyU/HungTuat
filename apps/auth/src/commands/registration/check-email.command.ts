import { Command } from '@common';

export class CheckEmailCommand extends Command<{ available: boolean; email: string }> {
   constructor(public readonly email: string) {
      super();
   }
}
