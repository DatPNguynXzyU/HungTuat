import { Command } from '@common';

export class GetMutualFollowersCommand extends Command<string[]> {
   constructor(
      public readonly userId1: string,
      public readonly userId2: string,
   ) {
      super();
   }
}
