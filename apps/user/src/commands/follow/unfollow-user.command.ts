import { Command, type IServiceMessage } from '@common';

export class UnfollowUserCommand extends Command<{ success: boolean }> {
   constructor(public readonly message: IServiceMessage<{ followerId: string; followingId: string }>) {
      super();
   }
}
