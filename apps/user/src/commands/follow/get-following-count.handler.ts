import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import { FollowService } from '@user/services/domain/follow.service';
import { GetFollowingCountCommand } from '@user/commands/follow/get-following-count.command';

@Injectable()
@CommandHandler(GetFollowingCountCommand)
export class GetFollowingCountHandler implements ICommandHandler<GetFollowingCountCommand, { count: number }> {
   constructor(private readonly followService: FollowService) {}

   async execute(command: GetFollowingCountCommand): Promise<{ count: number }> {
      const count = await this.followService.getFollowingCount(command.userId, command.status);
      return { count };
   }
}
