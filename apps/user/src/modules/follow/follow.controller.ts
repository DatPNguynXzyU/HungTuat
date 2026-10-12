import { Controller } from '@nestjs/common';
import { Ctx, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { BadRequestException, checkOwnershipOrAdmin, RmqService, USER_ERROR_CODES, USER_PATTERNS } from '@common';
import type { IServiceMessage } from '@common';
import { FollowStatus } from '@user/core/database/entities';
import { FollowService } from './follow.service';

@Controller()
export class FollowController {
   constructor(
      private readonly followService: FollowService,
      private readonly rmqService: RmqService,
   ) {}

   @MessagePattern({ cmd: USER_PATTERNS.FOLLOW_USER })
   async followUser(
      @Payload() message: IServiceMessage<{ followerId: string; followingId: string }>,
      @Ctx() context?: RmqContext,
   ) {
      try {
         checkOwnershipOrAdmin(message, message.data.followerId);

         const result = await this.followService.followUser(message.data.followerId, message.data.followingId);
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
         checkOwnershipOrAdmin(message, message.data.followerId);

         await this.followService.unfollowUser(message.data.followerId, message.data.followingId);
         if (context) {
            this.rmqService.ack(context);
         }
         return { success: true };
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
         const result = await this.followService.acceptFollowRequest(data.followId);
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
         const result = await this.followService.rejectFollowRequest(data.followId);
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
         const result = await this.followService.getFollowers(
            data.userId,
            data.status ? (data.status as FollowStatus) : undefined,
            data.skip,
            data.take,
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
         const result = await this.followService.getFollowing(
            data.userId,
            data.status ? (data.status as FollowStatus) : undefined,
            data.skip,
            data.take,
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
         const result = await this.followService.getFollowersCount(
            data.userId,
            data.status ? (data.status as FollowStatus) : undefined,
         );
         if (context) {
            this.rmqService.ack(context);
         }
         return { count: result };
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
         const result = await this.followService.getFollowingCount(
            data.userId,
            data.status ? (data.status as FollowStatus) : undefined,
         );
         if (context) {
            this.rmqService.ack(context);
         }
         return { count: result };
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
         const result = await this.followService.getMutualFollowers(data.userId1, data.userId2);
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
         if (!data?.userId) {
            throw new BadRequestException(USER_ERROR_CODES.USER_ID_REQUIRED);
         }
         const result = await this.followService.getFollowSuggestions(data.userId, data.limit);
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
