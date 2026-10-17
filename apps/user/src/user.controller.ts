import { Controller, Get } from '@nestjs/common';
import { Ctx, EventPattern, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { CommandBus, RmqService } from '@common';
import { NOTIFICATION_EVENTS } from '@contracts/notification';
import { USER_PATTERNS } from '@contracts/user';
import type { IServiceMessage } from '@common';
import { FollowStatus, Gender } from '@user/entities';
import { UserCoreService } from '@user/services/domain';
import {
   CreateProfileCommand,
   CreateUserCommand,
   DeleteUserCommand,
   GetAvatarUploadSignatureCommand,
   GetDateOfBirthCommand,
   GetUserByAccountIdCommand,
   GetUserByIdCommand,
   GetUserByUserIdCommand,
   GetUserByUsernameCommand,
   RestoreUserCommand,
   UpdateUsernameCommand,
   UpdateUserProfileCommand,
   UploadAvatarCommand,
   UpsertUserProfileCommand,
} from '@user/commands/profile';
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
import { SearchUsersCommand } from '@user/commands/search';
import { CheckUsernameCommand, HandleUserRegisteredCommand } from '@user/commands/authentication';

/**
 * UserController acts as the centralized transport adapter and entry point
 * for all RMQ messages in the User microservice, decoupling the transport layer
 * from domain logic and coordinating through UserCoreService (Facade) and the CommandBus layer.
 *
 * Provides a unified entry point consistent with AuthController in Auth Service.
 */
@Controller()
export class UserController {
   constructor(
      private readonly commandBus: CommandBus,
      private readonly rmqService: RmqService,
      private readonly userCoreService: UserCoreService,
   ) {}

   @Get(['', 'health'])
   healthCheck() {
      return { status: 'ok', service: 'user', timestamp: new Date().toISOString() };
   }

   /*
    -- Authentication & Registration Events --
   */

   @EventPattern(NOTIFICATION_EVENTS.USER_REGISTERED)
   async handleUserRegistered(@Payload() data: { accountId: string; email?: string }, @Ctx() context?: RmqContext) {
      try {
         const result = await this.commandBus.execute(new HandleUserRegisteredCommand(data));
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

   @MessagePattern({ cmd: USER_PATTERNS.CHECK_USERNAME })
   async checkUsername(@Payload() data: { username: string }, @Ctx() context?: RmqContext) {
      try {
         const result = await this.commandBus.execute(new CheckUsernameCommand(data.username));
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

   /*
    -- Profile Creation & Queries --
   */

   @MessagePattern({ cmd: USER_PATTERNS.CREATE_PROFILE })
   @MessagePattern({ cmd: USER_PATTERNS.CREATE_USER_PROFILE })
   async createProfile(
      @Payload()
      message: IServiceMessage<{
         username?: string;
         displayName?: string;
         gender?: Gender;
         dateOfBirth?: string | Date;
         bio?: string;
         avatar?: string;
         coverImage?: string;
         website?: string;
         location?: string;
         accountId?: string;
         userId?: string;
      }>,
      @Ctx() context?: RmqContext,
   ) {
      try {
         const result = await this.commandBus.execute(new CreateProfileCommand(message));
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

   @MessagePattern({ cmd: USER_PATTERNS.CREATE_USER })
   async createUser(
      @Payload()
      data: {
         accountId: string;
         username?: string;
         displayName?: string;
         gender?: Gender;
         dateOfBirth?: string | Date;
         bio?: string;
         avatar?: string;
         coverImage?: string;
         website?: string;
         location?: string;
      },
      @Ctx() context?: RmqContext,
   ) {
      try {
         const result = await this.commandBus.execute(new CreateUserCommand(data));
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

   @MessagePattern({ cmd: USER_PATTERNS.GET_USER_BY_ID })
   async getUserById(@Payload() message: IServiceMessage<{ userId: string }>, @Ctx() context?: RmqContext) {
      try {
         const result = await this.commandBus.execute(new GetUserByIdCommand(message));
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

   @MessagePattern({ cmd: USER_PATTERNS.GET_USER_BY_USER_ID })
   async getUserByUserId(@Payload() data: { userId: string }, @Ctx() context?: RmqContext) {
      try {
         const result = await this.commandBus.execute(new GetUserByUserIdCommand(data.userId));
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

   @MessagePattern({ cmd: USER_PATTERNS.GET_USER_BY_ACCOUNT_ID })
   async getUserByAccountId(@Payload() data: { accountId: string }, @Ctx() context?: RmqContext) {
      try {
         const result = await this.commandBus.execute(new GetUserByAccountIdCommand(data.accountId));
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

   @MessagePattern({ cmd: USER_PATTERNS.GET_USER_BY_USERNAME })
   async getUserByUsername(@Payload() data: { username: string }, @Ctx() context?: RmqContext) {
      try {
         const result = await this.commandBus.execute(new GetUserByUsernameCommand(data.username));
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

   @MessagePattern({ cmd: USER_PATTERNS.GET_DATE_OF_BIRTH })
   async getDateOfBirth(@Payload() data: { userId: string }, @Ctx() context?: RmqContext) {
      try {
         const result = await this.commandBus.execute(new GetDateOfBirthCommand(data?.userId));
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

   /*
    -- Profile Lifecycle Mutations --
   */

   @MessagePattern({ cmd: USER_PATTERNS.UPDATE_USER_PROFILE })
   async updateUserProfile(
      @Payload()
      message: IServiceMessage<{
         userId: string;
         username?: string;
         displayName?: string;
         gender?: Gender;
         dateOfBirth?: string | Date;
         bio?: string;
         avatar?: string;
         coverImage?: string;
         website?: string;
         location?: string;
      }>,
      @Ctx() context?: RmqContext,
   ) {
      try {
         const result = await this.commandBus.execute(new UpdateUserProfileCommand(message));
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

   @MessagePattern({ cmd: USER_PATTERNS.UPSERT_USER_PROFILE })
   async upsertUserProfile(
      @Payload()
      message: IServiceMessage<{
         userId: string;
         username?: string;
         displayName?: string;
         gender?: Gender;
         dateOfBirth?: string | Date;
         bio?: string;
         avatar?: string;
         coverImage?: string;
         website?: string;
         location?: string;
      }>,
      @Ctx() context?: RmqContext,
   ) {
      try {
         const result = await this.commandBus.execute(new UpsertUserProfileCommand(message));
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

   @MessagePattern({ cmd: USER_PATTERNS.UPDATE_USERNAME })
   async updateUsername(
      @Payload() message: IServiceMessage<{ userId: string; username: string }>,
      @Ctx() context?: RmqContext,
   ) {
      try {
         const result = await this.commandBus.execute(new UpdateUsernameCommand(message));
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

   @MessagePattern({ cmd: USER_PATTERNS.DELETE_USER })
   async deleteUser(@Payload() message: IServiceMessage<{ userId: string }>, @Ctx() context?: RmqContext) {
      try {
         const result = await this.commandBus.execute(new DeleteUserCommand(message));
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

   @MessagePattern({ cmd: USER_PATTERNS.RESTORE_USER })
   async restoreUser(@Payload() data: { userId: string }, @Ctx() context?: RmqContext) {
      try {
         const result = await this.commandBus.execute(new RestoreUserCommand(data.userId));
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

   /*
    -- Avatar & Media --
   */

   @MessagePattern({ cmd: USER_PATTERNS.UPLOAD_AVATAR })
   async uploadAvatar(
      @Payload() message: IServiceMessage<{ userId?: string; fileBase64: string; mimeType?: string }>,
      @Ctx() context?: RmqContext,
   ) {
      try {
         const result = await this.commandBus.execute(new UploadAvatarCommand(message));
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

   @MessagePattern({ cmd: USER_PATTERNS.GET_AVATAR_UPLOAD_SIGNATURE })
   async getAvatarUploadSignature(
      @Payload() message: IServiceMessage<{ userId?: string }>,
      @Ctx() context?: RmqContext,
   ) {
      try {
         const result = await this.commandBus.execute(new GetAvatarUploadSignatureCommand(message));
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

   /*
    -- Social Graph & Follow Operations --
   */

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
      @Payload()
      data: {
         userId: string;
         status?: string;
         skip?: number;
         take?: number;
      },
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
      @Payload()
      data: {
         userId: string;
         status?: string;
         skip?: number;
         take?: number;
      },
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

   /*
    -- Elasticsearch Search Operations --
   */

   @MessagePattern({ cmd: USER_PATTERNS.SEARCH_USERS })
   async searchUsers(
      @Payload() data: { query: string; limit?: number; cursor?: string; currentUserId?: string },
      @Ctx() context?: RmqContext,
   ) {
      try {
         const result = await this.commandBus.execute(
            new SearchUsersCommand(data.query, data.limit, data.cursor, data.currentUserId),
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

   /*
    -- CQRS Projections & Rebuild Operations --
   */

   @MessagePattern({ cmd: USER_PATTERNS.GET_USER_STATS })
   async getUserStats(@Payload() data: { userId: string }, @Ctx() context?: RmqContext) {
      try {
         const result = await this.userCoreService.getUserStats(data.userId);
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

   @MessagePattern({ cmd: USER_PATTERNS.REBUILD_PROJECTIONS })
   async rebuildProjections(
      @Payload() data?: { options?: { batchSize?: number; fromVersion?: number; resetBeforeRebuild?: boolean } },
      @Ctx() context?: RmqContext,
   ) {
      try {
         const result = await this.userCoreService.rebuildProjections(data?.options);
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
