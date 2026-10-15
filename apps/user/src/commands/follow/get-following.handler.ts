import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import type { FollowEntity } from '@user/entities';
import { FollowService } from '@user/services/domain/follow.service';
import { GetFollowingCommand } from '@user/commands/follow/get-following.command';

@Injectable()
@CommandHandler(GetFollowingCommand)
export class GetFollowingHandler implements ICommandHandler<GetFollowingCommand, FollowEntity[]> {
   constructor(private readonly followService: FollowService) {}

   async execute(command: GetFollowingCommand): Promise<FollowEntity[]> {
      return this.followService.getFollowing(command.userId, command.status, command.skip, command.take);
   }
}
