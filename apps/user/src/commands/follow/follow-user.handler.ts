import { Injectable } from '@nestjs/common';
import { CommandHandler, checkOwnershipOrAdmin, type ICommandHandler } from '@common';
import type { FollowEntity } from '@user/entities';
import { FollowService } from '@user/services/domain/follow.service';
import { FollowUserCommand } from '@user/commands/follow/follow-user.command';

@Injectable()
@CommandHandler(FollowUserCommand)
export class FollowUserHandler implements ICommandHandler<FollowUserCommand, FollowEntity> {
   constructor(private readonly followService: FollowService) {}

   async execute(command: FollowUserCommand): Promise<FollowEntity> {
      const { message } = command;
      checkOwnershipOrAdmin(message, message.data.followerId);
      return this.followService.followUser(message.data.followerId, message.data.followingId);
   }
}
