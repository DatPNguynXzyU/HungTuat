import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import { FollowService } from '@user/services/domain/follow.service';
import { GetMutualFollowersCommand } from '@user/commands/follow/get-mutual-followers.command';

@Injectable()
@CommandHandler(GetMutualFollowersCommand)
export class GetMutualFollowersHandler implements ICommandHandler<GetMutualFollowersCommand, string[]> {
   constructor(private readonly followService: FollowService) {}

   async execute(command: GetMutualFollowersCommand): Promise<string[]> {
      return this.followService.getMutualFollowers(command.userId1, command.userId2);
   }
}
