import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import type { FollowEntity } from '@user/entities';
import { FollowService } from '@user/services/domain/follow.service';
import { RejectFollowRequestCommand } from '@user/commands/follow/reject-follow-request.command';

@Injectable()
@CommandHandler(RejectFollowRequestCommand)
export class RejectFollowRequestHandler implements ICommandHandler<RejectFollowRequestCommand, FollowEntity> {
   constructor(private readonly followService: FollowService) {}

   async execute(command: RejectFollowRequestCommand): Promise<FollowEntity> {
      return this.followService.rejectFollowRequest(command.followId);
   }
}
