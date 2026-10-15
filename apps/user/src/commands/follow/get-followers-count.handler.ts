import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import { FollowService } from '@user/services/domain/follow.service';
import { GetFollowersCountCommand } from '@user/commands/follow/get-followers-count.command';

@Injectable()
@CommandHandler(GetFollowersCountCommand)
export class GetFollowersCountHandler implements ICommandHandler<GetFollowersCountCommand, { count: number }> {
   constructor(private readonly followService: FollowService) {}

   async execute(command: GetFollowersCountCommand): Promise<{ count: number }> {
      const count = await this.followService.getFollowersCount(command.userId, command.status);
      return { count };
   }
}
