import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserService } from '@user/user.service';
import { Gender, FollowStatus } from '@user/entities';
import { checkOwnershipOrAdmin } from '@common';
import type { IServiceMessage } from '@common';

@Controller()
export class UserController {
   constructor(private readonly userService: UserService) {}

   // User Profile Operations
   @MessagePattern({ cmd: 'create_user' })
   async createUser(
      @Payload()
      data: {
         userId: string;
         email?: string;
         username?: string;
         displayName?: string;
      },
   ) {
      return this.userService.createUser(data);
   }

   @MessagePattern({ cmd: 'get_user_by_id' })
   async getUserById(@Payload() message: IServiceMessage<{ id: string }>) {
      // Public endpoint - no authorization needed
      return this.userService.getUserById(message.data.id);
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
   async updateUserProfile(
      @Payload()
      message: IServiceMessage<{
         id: string;
         displayName?: string;
         bio?: string;
         avatar?: string;
         coverImage?: string;
         website?: string;
         location?: string;
         dateOfBirth?: Date;
         gender?: string;
      }>,
   ) {
      const { id, gender, ...updateData } = message.data;

      // Authorization: User can only update their own profile OR admin can update any profile
      const user = await this.userService.getUserById(id);
      if (user) {
         checkOwnershipOrAdmin(message, user.userId);
      }

      return this.userService.updateUserProfile(id, {
         ...updateData,
         ...(gender && { gender: gender as Gender }),
      });
   }

   @MessagePattern({ cmd: 'update_username' })
   async updateUsername(@Payload() message: IServiceMessage<{ id: string; username: string }>) {
      // Authorization: User can only update their own username OR admin can update any username
      const user = await this.userService.getUserById(message.data.id);
      if (user) {
         checkOwnershipOrAdmin(message, user.userId);
      }

      return this.userService.updateUsername(message.data.id, message.data.username);
   }

   @MessagePattern({ cmd: 'delete_user' })
   async deleteUser(@Payload() message: IServiceMessage<{ id: string }>) {
      // Authorization: User can only delete their own account OR admin can delete any account
      const user = await this.userService.getUserById(message.data.id);
      if (user) {
         checkOwnershipOrAdmin(message, user.userId);
      }

      return this.userService.deleteUser(message.data.id);
   }

   @MessagePattern({ cmd: 'restore_user' })
   async restoreUser(@Payload() data: { id: string }) {
      return this.userService.restoreUser(data.id);
   }

   // Follow Operations
   @MessagePattern({ cmd: 'follow_user' })
   async followUser(@Payload() message: IServiceMessage<{ followerId: string; followingId: string }>) {
      // Authorization: User can only follow as themselves
      checkOwnershipOrAdmin(message, message.data.followerId);

      return this.userService.followUser(message.data.followerId, message.data.followingId);
   }

   @MessagePattern({ cmd: 'unfollow_user' })
   async unfollowUser(@Payload() message: IServiceMessage<{ followerId: string; followingId: string }>) {
      // Authorization: User can only unfollow as themselves
      checkOwnershipOrAdmin(message, message.data.followerId);

      await this.userService.unfollowUser(message.data.followerId, message.data.followingId);
      return { success: true };
   }

   @MessagePattern({ cmd: 'accept_follow_request' })
   async acceptFollowRequest(@Payload() data: { followId: string }) {
      // TODO: Add authorization check - only the followed user can accept
      return this.userService.acceptFollowRequest(data.followId);
   }

   @MessagePattern({ cmd: 'reject_follow_request' })
   async rejectFollowRequest(@Payload() data: { followId: string }) {
      // TODO: Add authorization check - only the followed user can reject
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
      // Public endpoint - anyone can view followers
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
      // Public endpoint - anyone can view following
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
}
