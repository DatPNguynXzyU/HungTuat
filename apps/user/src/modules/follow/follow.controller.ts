import { Controller } from '@nestjs/common';
import { Ctx, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { CommandBus, RmqService } from '@common';
import { USER_PATTERNS } from '@contracts/user';
import type { IServiceMessage } from '@common';
import { FollowStatus } from '@user/core/database/entities';
import {
   AcceptFollowRequestCommand,
   FollowUserCommand,
   GetFollowersCommand,
   GetFollowersCountCommand,
   GetFollowingCommand,
   GetFollowingCountCommand,
   GetFollowSuggestionsCommand,
   GetMutualFollowersCommand,
   RejectFollowRequestCommand,
   UnfollowUserCommand,
} from '@user/commands/follow';

/**
 * FollowController acts as a transport adapter dispatching commands
 * to the CommandBus layer, decoupling the transport layer from concrete services.
 */
@Controller()
export class FollowController {
   constructor(
      private readonly commandBus: CommandBus,
      private readonly rmqService: RmqService,
   ) {}

   @MessagePattern({ cmd: USER_PATTERNS.FOLLOW_USER })
   async followUser(
      @Payload() message: IServiceMessage<{ followerId: string; followingId: string }>,
      @Ctx() context?: RmqContext,
   ) {
      try {
         const result = await this.commandBus.execute(new FollowUserCommand(message));
         if (context) {
            this.rmqService.ack(context);
         }
         return result;
      } catch (error) {
         if (context) {
            this.rmqService.ack(context);
         }
         throw error;
      }
   }

   @MessagePattern({ cmd: USER_PATTERNS.UNFOLLOW_USER })
   async unfollowUser(
      @Payload() message: IServiceMessage<{ followerId: string; followingId: string }>,
      @Ctx() context?: RmqContext,
   ) {
      try {
         const result = await this.commandBus.execute(new UnfollowUserCommand(message));
         if (context) {
            this.rmqService.ack(context);
         }
         return result;
      } catch (error) {
         if (context) {
            this.rmqService.ack(context);
         }
         throw error;
      }
   }

   @MessagePattern({ cmd: USER_PATTERNS.ACCEPT_FOLLOW_REQUEST })
   async acceptFollowRequest(@Payload() data: { followId: string }, @Ctx() context?: RmqContext) {
      try {
         const result = await this.commandBus.execute(new AcceptFollowRequestCommand(data.followId));
         if (context) {
            this.rmqService.ack(context);
         }
         return result;
      } catch (error) {
         if (context) {
            this.rmqService.ack(context);
         }
         throw error;
      }
   }

   @MessagePattern({ cmd: USER_PATTERNS.REJECT_FOLLOW_REQUEST })
   async rejectFollowRequest(@Payload() data: { followId: string }, @Ctx() context?: RmqContext) {
      try {
         const result = await this.commandBus.execute(new RejectFollowRequestCommand(data.followId));
         if (context) {
            this.rmqService.ack(context);
         }
         return result;
      } catch (error) {
         if (context) {
            this.rmqService.ack(context);
         }
         throw error;
      }
   }

   @MessagePattern({ cmd: USER_PATTERNS.GET_FOLLOWERS })
   async getFollowers(
      @Payload() data: { userId: string; status?: string; skip?: number; take?: number },
      @Ctx() context?: RmqContext,
   ) {
      try {
         const result = await this.commandBus.execute(
            new GetFollowersCommand(
               data.userId,
               data.status ? (data.status as FollowStatus) : undefined,
               data.skip,
               data.take,
            ),
         );
         if (context) {
            this.rmqService.ack(context);
         }
         return result;
      } catch (error) {
         if (context) {
            this.rmqService.ack(context);
         }
         throw error;
      }
   }

   @MessagePattern({ cmd: USER_PATTERNS.GET_FOLLOWING })
   async getFollowing(
      @Payload() data: { userId: string; status?: string; skip?: number; take?: number },
      @Ctx() context?: RmqContext,
   ) {
      try {
         const result = await this.commandBus.execute(
            new GetFollowingCommand(
               data.userId,
               data.status ? (data.status as FollowStatus) : undefined,
               data.skip,
               data.take,
            ),
         );
         if (context) {
            this.rmqService.ack(context);
         }
         return result;
      } catch (error) {
         if (context) {
            this.rmqService.ack(context);
         }
         throw error;
      }
   }

   @MessagePattern({ cmd: USER_PATTERNS.GET_FOLLOWERS_COUNT })
   async getFollowersCount(@Payload() data: { userId: string; status?: string }, @Ctx() context?: RmqContext) {
      try {
         const result = await this.commandBus.execute(
            new GetFollowersCountCommand(data.userId, data.status ? (data.status as FollowStatus) : undefined),
         );
         if (context) {
            this.rmqService.ack(context);
         }
         return result;
      } catch (error) {
         if (context) {
            this.rmqService.ack(context);
         }
         throw error;
      }
   }

   @MessagePattern({ cmd: USER_PATTERNS.GET_FOLLOWING_COUNT })
   async getFollowingCount(@Payload() data: { userId: string; status?: string }, @Ctx() context?: RmqContext) {
      try {
         const result = await this.commandBus.execute(
            new GetFollowingCountCommand(data.userId, data.status ? (data.status as FollowStatus) : undefined),
         );
         if (context) {
            this.rmqService.ack(context);
         }
         return result;
      } catch (error) {
         if (context) {
            this.rmqService.ack(context);
         }
         throw error;
      }
   }

   @MessagePattern({ cmd: USER_PATTERNS.GET_MUTUAL_FOLLOWERS })
   async getMutualFollowers(@Payload() data: { userId1: string; userId2: string }, @Ctx() context?: RmqContext) {
      try {
         const result = await this.commandBus.execute(new GetMutualFollowersCommand(data.userId1, data.userId2));
         if (context) {
            this.rmqService.ack(context);
         }
         return result;
      } catch (error) {
         if (context) {
            this.rmqService.ack(context);
         }
         throw error;
      }
   }

   @MessagePattern({ cmd: USER_PATTERNS.GET_FOLLOW_SUGGESTIONS })
   async getFollowSuggestions(@Payload() data: { userId: string; limit?: number }, @Ctx() context?: RmqContext) {
      try {
         const result = await this.commandBus.execute(new GetFollowSuggestionsCommand(data?.userId, data?.limit));
         if (context) {
            this.rmqService.ack(context);
         }
         return result;
      } catch (error) {
         if (context) {
            this.rmqService.ack(context);
         }
         throw error;
      }
   }
}
