import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import type { FollowEntity } from '@user/core/database/entities';
import { FollowService } from '@user/services/domain/follow.service';
import { GetFollowersCommand } from '@user/commands/follow/get-followers.command';

@Injectable()
@CommandHandler(GetFollowersCommand)
export class GetFollowersHandler implements ICommandHandler<GetFollowersCommand, FollowEntity[]> {
   constructor(private readonly followService: FollowService) {}

   async execute(command: GetFollowersCommand): Promise<FollowEntity[]> {
      return this.followService.getFollowers(command.userId, command.status, command.skip, command.take);
   }
}
