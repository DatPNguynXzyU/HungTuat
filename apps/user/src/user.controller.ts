import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { UserService } from '@user/user.service';
import { Gender, FollowStatus } from '@user/entities';
import {
   BadRequestException,
   checkOwnershipOrAdmin,
   NOTIFICATION_EVENTS,
   RmqService,
   USER_ERROR_CODES,
   USER_PATTERNS,
} from '@common';
import type { IServiceMessage } from '@common';

@Controller()
export class UserController {
   constructor(
      private readonly userService: UserService,
      private readonly rmqService: RmqService,
   ) {}

   // Event listener from Auth service via RabbitMQ
   @EventPattern(NOTIFICATION_EVENTS.USER_REGISTERED)
   async handleUserRegistered(@Payload() data: { accountId: string; email?: string }, @Ctx() context?: RmqContext) {
      try {
         const result = await this.userService.handleUserRegistered(data);
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

   // User Profile Operations
   @MessagePattern({ cmd: USER_PATTERNS.CHECK_USERNAME })
   async checkUsername(@Payload() data: { username: string }, @Ctx() context?: RmqContext) {
      try {
         const result = await this.userService.checkUsername(data.username);
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

   @MessagePattern({ cmd: USER_PATTERNS.CREATE_PROFILE })
   @MessagePattern({ cmd: USER_PATTERNS.CREATE_USER_PROFILE })
   async createProfile(
      @Payload()
      message: IServiceMessage<{
         username?: string;
         displayName?: string;
         gender?: string;
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
         const accountId = message.data?.accountId || message.user?.userId || message.data?.userId;
         if (!accountId) {
            throw new BadRequestException(USER_ERROR_CODES.USER_ID_REQUIRED);
         }

         const { gender, dateOfBirth, ...profileData } = message.data;

         const result = await this.userService.createUser({
            accountId,
            ...profileData,
            ...(gender && { gender: gender as Gender }),
            ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
         });
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
         gender?: string;
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
         const { accountId, gender, dateOfBirth, ...profileData } = data;
         const result = await this.userService.createUser({
            accountId,
            ...profileData,
            ...(gender && { gender: gender as Gender }),
            ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
         });
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
   async getUserById(@Payload() message: IServiceMessage<{ id: string }>, @Ctx() context?: RmqContext) {
      try {
         try {
            const result = await this.userService.getUserById(message.data.id);
            if (context) {
               this.rmqService.ack(context);
            }
            return result;
         } catch (err) {
            if (message.user && message.user.userId === message.data.id) {
               try {
                  const autoCreated = await this.userService.handleUserRegistered({
                     accountId: message.user.userId,
                     email: message.user.email,
                  });
                  if (autoCreated) {
                     if (context) {
                        this.rmqService.ack(context);
                     }
                     return autoCreated;
                  }
               } catch {
                  const fallbackUser = await this.userService.getUserById(message.data.id);
                  if (fallbackUser) {
                     if (context) {
                        this.rmqService.ack(context);
                     }
                     return fallbackUser;
                  }
               }
            }
            throw err;
         }
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
         const result = await this.userService.getUserByUserId(data.userId);
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
         const result = await this.userService.getUserByAccountId(data.accountId);
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
         const result = await this.userService.getUserByUsername(data.username);
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
         if (!data?.userId) {
            throw new BadRequestException(USER_ERROR_CODES.USER_ID_REQUIRED);
         }
         const result = await this.userService.getDateOfBirth(data.userId);
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

   @MessagePattern({ cmd: USER_PATTERNS.UPDATE_USER_PROFILE })
   @MessagePattern({ cmd: USER_PATTERNS.UPDATE_USER })
   async updateUserProfile(
      @Payload()
      message: IServiceMessage<{
         id: string;
         username?: string;
         displayName?: string;
         gender?: string;
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
         const { id, gender, dateOfBirth, ...updateData } = message.data;

         let targetOwnerId = id;
         try {
            const existingUser = await this.userService.getUserById(id);
            if (existingUser) {
               targetOwnerId = existingUser.accountId;
            }
         } catch {
            // User does not exist in DB yet, fallback to comparing id with message.user.userId
         }

         checkOwnershipOrAdmin(message, targetOwnerId);

         const result = await this.userService.updateUserProfile(id, {
            ...updateData,
            ...(gender && { gender: gender as Gender }),
            ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
         });
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
      @Payload() message: IServiceMessage<{ id: string; username: string }>,
      @Ctx() context?: RmqContext,
   ) {
      try {
         const user = await this.userService.getUserById(message.data.id);
         if (user) {
            checkOwnershipOrAdmin(message, user.accountId);
         }

         const result = await this.userService.updateUsername(user.id, message.data.username);
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
   async deleteUser(@Payload() message: IServiceMessage<{ id: string }>, @Ctx() context?: RmqContext) {
      try {
         const user = await this.userService.getUserById(message.data.id);
         if (user) {
            checkOwnershipOrAdmin(message, user.accountId);
         }

         const result = await this.userService.deleteUser(user.id);
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
   async restoreUser(@Payload() data: { id: string }, @Ctx() context?: RmqContext) {
      try {
         const result = await this.userService.restoreUser(data.id);
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

   // Follow Operations
   @MessagePattern({ cmd: USER_PATTERNS.FOLLOW_USER })
   async followUser(
      @Payload() message: IServiceMessage<{ followerId: string; followingId: string }>,
      @Ctx() context?: RmqContext,
   ) {
      try {
         checkOwnershipOrAdmin(message, message.data.followerId);

         const result = await this.userService.followUser(message.data.followerId, message.data.followingId);
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

         await this.userService.unfollowUser(message.data.followerId, message.data.followingId);
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
         const result = await this.userService.acceptFollowRequest(data.followId);
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
         const result = await this.userService.rejectFollowRequest(data.followId);
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
         const result = await this.userService.getFollowers(
            data.userId,
            data.status as FollowStatus | undefined,
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
         const result = await this.userService.getFollowing(
            data.userId,
            data.status as FollowStatus | undefined,
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
         const result = await this.userService.getFollowersCount(data.userId, data.status as FollowStatus | undefined);
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
         const result = await this.userService.getFollowingCount(data.userId, data.status as FollowStatus | undefined);
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

   // Advanced Graph Queries
   @MessagePattern({ cmd: USER_PATTERNS.GET_MUTUAL_FOLLOWERS })
   async getMutualFollowers(@Payload() data: { userId1: string; userId2: string }, @Ctx() context?: RmqContext) {
      try {
         const result = await this.userService.getMutualFollowers(data.userId1, data.userId2);
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
         const result = await this.userService.getFollowSuggestions(data.userId, data.limit);
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

   // Search Users via Elasticsearch
   @MessagePattern({ cmd: USER_PATTERNS.SEARCH_USERS })
   async searchUsers(
      @Payload() data: { query: string; limit?: number; cursor?: string; currentUserId?: string },
      @Ctx() context?: RmqContext,
   ) {
      try {
         const result = await this.userService.searchUsers(data.query, data.limit, data.cursor, data.currentUserId);
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

   // Cloudinary Avatar Management
   @MessagePattern({ cmd: USER_PATTERNS.UPLOAD_AVATAR })
   async uploadAvatar(
      @Payload() message: IServiceMessage<{ id?: string; fileBase64: string; mimeType?: string }>,
      @Ctx() context?: RmqContext,
   ) {
      try {
         const targetUserId = message.data.id || message.user?.userId;
         if (!targetUserId) {
            throw new BadRequestException(USER_ERROR_CODES.USER_ID_REQUIRED);
         }
         checkOwnershipOrAdmin(message, targetUserId);

         const result = await this.userService.uploadAvatar(
            targetUserId,
            message.data.fileBase64,
            message.data.mimeType,
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

   @MessagePattern({ cmd: USER_PATTERNS.GET_AVATAR_UPLOAD_SIGNATURE })
   async getAvatarUploadSignature(@Payload() message: IServiceMessage<{ id?: string }>, @Ctx() context?: RmqContext) {
      try {
         const targetUserId = message.data.id || message.user?.userId;
         if (!targetUserId) {
            throw new BadRequestException(USER_ERROR_CODES.USER_ID_REQUIRED);
         }
         checkOwnershipOrAdmin(message, targetUserId);

         const result = await this.userService.getAvatarUploadSignature(targetUserId);
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
