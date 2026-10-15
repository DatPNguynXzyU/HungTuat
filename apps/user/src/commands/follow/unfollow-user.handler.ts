import { Injectable } from '@nestjs/common';
import { CommandHandler, checkOwnershipOrAdmin, type ICommandHandler } from '@common';
import { FollowService } from '@user/services/domain/follow.service';
import { UnfollowUserCommand } from '@user/commands/follow/unfollow-user.command';

@Injectable()
@CommandHandler(UnfollowUserCommand)
export class UnfollowUserHandler implements ICommandHandler<UnfollowUserCommand, { success: boolean }> {
   constructor(private readonly followService: FollowService) {}

   async execute(command: UnfollowUserCommand): Promise<{ success: boolean }> {
      const { message } = command;
      checkOwnershipOrAdmin(message, message.data.followerId);
      await this.followService.unfollowUser(message.data.followerId, message.data.followingId);
      return { success: true };
   }
}
