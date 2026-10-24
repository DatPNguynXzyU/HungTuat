import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import { FollowService } from '@user/services/domain/follow.service';
import { CheckIsFollowingCommand, type CheckIsFollowingResult } from '@user/commands/follow/check-is-following.command';

@Injectable()
@CommandHandler(CheckIsFollowingCommand)
export class CheckIsFollowingHandler implements ICommandHandler<CheckIsFollowingCommand, CheckIsFollowingResult> {
   constructor(private readonly followService: FollowService) {}

   async execute(command: CheckIsFollowingCommand): Promise<CheckIsFollowingResult> {
      const result = await this.followService.checkIsFollowing(command.followerId, command.followingId);
      return {
         isFollowing: result.isFollowing,
         status: result.status ? String(result.status) : undefined,
      };
   }
}
