import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@common';
import type { FollowEntity } from '@user/core/database/entities';
import { FollowService } from '@user/services/domain/follow.service';
import { AcceptFollowRequestCommand } from '@user/commands/follow/accept-follow-request.command';

@Injectable()
@CommandHandler(AcceptFollowRequestCommand)
export class AcceptFollowRequestHandler implements ICommandHandler<AcceptFollowRequestCommand, FollowEntity> {
   constructor(private readonly followService: FollowService) {}

   async execute(command: AcceptFollowRequestCommand): Promise<FollowEntity> {
      return this.followService.acceptFollowRequest(command.followId);
   }
}
