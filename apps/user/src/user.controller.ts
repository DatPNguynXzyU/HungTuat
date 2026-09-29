import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserService } from '@user/user.service';
import { Gender, FollowStatus } from '@user/entities';

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
   async getUserById(@Payload() data: { id: string }) {
      return this.userService.getUserById(data.id);
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
      data: {
         id: string;
         displayName?: string;
         bio?: string;
         avatar?: string;
         coverImage?: string;
         website?: string;
         location?: string;
         dateOfBirth?: Date;
         gender?: string;
      },
   ) {
      const { id, gender, ...updateData } = data;
      return this.userService.updateUserProfile(id, {
         ...updateData,
         ...(gender && { gender: gender as Gender }),
      });
   }

   @MessagePattern({ cmd: 'update_username' })
   async updateUsername(@Payload() data: { id: string; username: string }) {
      return this.userService.updateUsername(data.id, data.username);
   }

   @MessagePattern({ cmd: 'delete_user' })
   async deleteUser(@Payload() data: { id: string }) {
      return this.userService.deleteUser(data.id);
   }

   @MessagePattern({ cmd: 'restore_user' })
   async restoreUser(@Payload() data: { id: string }) {
      return this.userService.restoreUser(data.id);
   }

   // Follow Operations
   @MessagePattern({ cmd: 'follow_user' })
   async followUser(@Payload() data: { followerId: string; followingId: string }) {
      return this.userService.followUser(data.followerId, data.followingId);
   }

   @MessagePattern({ cmd: 'unfollow_user' })
   async unfollowUser(@Payload() data: { followerId: string; followingId: string }) {
      await this.userService.unfollowUser(data.followerId, data.followingId);
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
}
