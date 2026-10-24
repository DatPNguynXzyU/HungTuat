import { Command } from '@common';

export class ElevateAccountRoleCommand extends Command<void> {
   constructor(
      public readonly accountId: string,
      public readonly role: string,
   ) {
      super();
   }
}
