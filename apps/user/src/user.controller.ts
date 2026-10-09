import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { UserService } from '@user/user.service';
import { Gender, FollowStatus } from '@user/entities';
import { BadRequestException, checkOwnershipOrAdmin, NOTIFICATION_EVENTS, RmqService, USER_ERROR_CODES } from '@common';
import type { IServiceMessage } from '@common';

@Controller()
export class UserController {
   constructor(
      private readonly userService: UserService,
      private readonly rmqService: RmqService,
   ) {}

   // Event listener from Auth service via RabbitMQ
   @EventPattern(NOTIFICATION_EVENTS.USER_REGISTERED)
   async handleUserRegistered(@Payload() data: { userId?: string; email?: string }, @Ctx() context?: RmqContext) {
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
   @MessagePattern({ cmd: 'check_username' })
   async checkUsername(@Payload() data: { username: string }) {
      return this.userService.checkUsername(data.username);
   }

   @MessagePattern({ cmd: 'create_profile' })
   @MessagePattern({ cmd: 'create_user_profile' })
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
         userId?: string;
      }>,
   ) {
      const userId = message.user?.userId || message.data?.userId;
      if (!userId) {
         throw new BadRequestException(USER_ERROR_CODES.USER_ID_REQUIRED);
      }

      const { gender, dateOfBirth, ...profileData } = message.data;

      return this.userService.createUser({
         userId,
         ...profileData,
         ...(gender && { gender: gender as Gender }),
         ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
      });
   }

   @MessagePattern({ cmd: 'create_user' })
   async createUser(
      @Payload()
      data: {
         userId: string;
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
   ) {
      const { gender, dateOfBirth, ...profileData } = data;
      return this.userService.createUser({
         ...profileData,
         ...(gender && { gender: gender as Gender }),
         ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
      });
   }

   @MessagePattern({ cmd: 'get_user_by_id' })
   async getUserById(@Payload() message: IServiceMessage<{ id: string }>) {
      try {
         return await this.userService.getUserById(message.data.id);
      } catch (err) {
         if (message.user && message.user.userId === message.data.id && message.user.email) {
            const autoCreated = await this.userService.handleUserRegistered({
               userId: message.user.userId,
               email: message.user.email,
            });
            if (autoCreated) {
               return autoCreated;
            }
         }
         throw err;
      }
   }

   @MessagePattern({ cmd: 'get_user_by_user_id' })
   async getUserByUserId(@Payload() data: { userId: string }) {
      return this.userService.getUserByUserId(data.userId);
   }

   @MessagePattern({ cmd: 'get_user_by_username' })
   async getUserByUsername(@Payload() data: { username: string }) {
      return this.userService.getUserByUsername(data.username);
   }

   @MessagePattern({ cmd: 'update_user_profile' })
   @MessagePattern({ cmd: 'update_user' })
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
   ) {
      const { id, gender, dateOfBirth, ...updateData } = message.data;

      let targetOwnerId = id;
      try {
         const existingUser = await this.userService.getUserById(id);
         if (existingUser) {
            targetOwnerId = existingUser.userId;
         }
      } catch {
         // User does not exist in DB yet, fallback to comparing id with message.user.userId
      }

      checkOwnershipOrAdmin(message, targetOwnerId);

      return this.userService.updateUserProfile(id, {
         ...updateData,
         ...(gender && { gender: gender as Gender }),
         ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
      });
   }

   @MessagePattern({ cmd: 'update_username' })
   async updateUsername(@Payload() message: IServiceMessage<{ id: string; username: string }>) {
      const user = await this.userService.getUserById(message.data.id);
      if (user) {
         checkOwnershipOrAdmin(message, user.userId);
      }

      return this.userService.updateUsername(user.id, message.data.username);
   }

   @MessagePattern({ cmd: 'delete_user' })
   async deleteUser(@Payload() message: IServiceMessage<{ id: string }>) {
      const user = await this.userService.getUserById(message.data.id);
      if (user) {
         checkOwnershipOrAdmin(message, user.userId);
      }

      return this.userService.deleteUser(user.id);
   }

   @MessagePattern({ cmd: 'restore_user' })
   async restoreUser(@Payload() data: { id: string }) {
      return this.userService.restoreUser(data.id);
   }

   // Follow Operations
   @MessagePattern({ cmd: 'follow_user' })
   async followUser(@Payload() message: IServiceMessage<{ followerId: string; followingId: string }>) {
      checkOwnershipOrAdmin(message, message.data.followerId);

      return this.userService.followUser(message.data.followerId, message.data.followingId);
   }

   @MessagePattern({ cmd: 'unfollow_user' })
   async unfollowUser(@Payload() message: IServiceMessage<{ followerId: string; followingId: string }>) {
      checkOwnershipOrAdmin(message, message.data.followerId);

      await this.userService.unfollowUser(message.data.followerId, message.data.followingId);
      return { success: true };
   }

   @MessagePattern({ cmd: 'accept_follow_request' })
   async acceptFollowRequest(@Payload() data: { followId: string }) {
      return this.userService.acceptFollowRequest(data.followId);
   }

   @MessagePattern({ cmd: 'reject_follow_request' })
   async rejectFollowRequest(@Payload() data: { followId: string }) {
      return this.userService.rejectFollowRequest(data.followId);
   }

   @MessagePattern({ cmd: 'get_followers' })
   async getFollowers(
      @Payload()
      data: {
         userId: string;
         status?: string;
         skip?: number;
         take?: number;
      },
   ) {
      return this.userService.getFollowers(data.userId, data.status as FollowStatus | undefined, data.skip, data.take);
   }

   @MessagePattern({ cmd: 'get_following' })
   async getFollowing(
      @Payload()
      data: {
         userId: string;
         status?: string;
         skip?: number;
         take?: number;
      },
   ) {
      return this.userService.getFollowing(data.userId, data.status as FollowStatus | undefined, data.skip, data.take);
   }

   @MessagePattern({ cmd: 'get_followers_count' })
   async getFollowersCount(@Payload() data: { userId: string; status?: string }) {
      return this.userService.getFollowersCount(data.userId, data.status as FollowStatus | undefined);
   }

   @MessagePattern({ cmd: 'get_following_count' })
   async getFollowingCount(@Payload() data: { userId: string; status?: string }) {
      return this.userService.getFollowingCount(data.userId, data.status as FollowStatus | undefined);
   }

   // Advanced Graph Queries
   @MessagePattern({ cmd: 'get_mutual_followers' })
   async getMutualFollowers(@Payload() data: { userId1: string; userId2: string }) {
      return this.userService.getMutualFollowers(data.userId1, data.userId2);
   }

   @MessagePattern({ cmd: 'get_follow_suggestions' })
   async getFollowSuggestions(@Payload() data: { userId: string; limit?: number }) {
      return this.userService.getFollowSuggestions(data.userId, data.limit);
   }

   // Search Users via Elasticsearch
   @MessagePattern({ cmd: 'search_users' })
   async searchUsers(@Payload() data: { query: string; limit?: number; skip?: number }) {
      return this.userService.searchUsers(data.query, data.limit, data.skip);
   }

   // Cloudinary Avatar Management
   @MessagePattern({ cmd: 'upload_avatar' })
   async uploadAvatar(@Payload() message: IServiceMessage<{ id?: string; fileBase64: string; mimeType?: string }>) {
      const targetUserId = message.data.id || message.user?.userId;
      if (!targetUserId) {
         throw new BadRequestException(USER_ERROR_CODES.USER_ID_REQUIRED);
      }
      checkOwnershipOrAdmin(message, targetUserId);

      return this.userService.uploadAvatar(targetUserId, message.data.fileBase64, message.data.mimeType);
   }

   @MessagePattern({ cmd: 'get_avatar_upload_signature' })
   async getAvatarUploadSignature(@Payload() message: IServiceMessage<{ id?: string }>) {
      const targetUserId = message.data.id || message.user?.userId;
      if (!targetUserId) {
         throw new BadRequestException(USER_ERROR_CODES.USER_ID_REQUIRED);
      }
      checkOwnershipOrAdmin(message, targetUserId);

      return this.userService.getAvatarUploadSignature(targetUserId);
   }
}
