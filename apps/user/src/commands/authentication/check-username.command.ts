import { Command } from '@common';

export class CheckUsernameCommand extends Command<{ available: boolean; username: string }> {
   constructor(public readonly username: string) {
      super();
   }
}
