import { Injectable } from '@nestjs/common';
import { NotFoundException, ConflictException, BadRequestException } from '@common';
import { UserRepository, FollowRepository } from '@user/repositories';
import { UserEntity, FollowEntity, FollowStatus, Gender } from '@user/entities';
import { OutboxService } from '@user/outbox';
import { USER_ERROR_CODES } from '@user/constants';
import { GraphFollowRepository } from '@user/graph';
import { UserGraphSyncService } from '@user/services';

@Injectable()
export class UserService {
   constructor(
      private readonly userRepository: UserRepository,
      private readonly followRepository: FollowRepository,
      private readonly outboxService: OutboxService,
      private readonly graphFollowRepository: GraphFollowRepository,
      private readonly userGraphSyncService: UserGraphSyncService,
   ) {}

   // User Profile Management
   async createUser(data: {
      userId: string;
      email?: string;
      username?: string;
      displayName?: string;
   }): Promise<UserEntity> {
      // Check if user already exists
      const existingUser = await this.userRepository.findByUserId(data.userId);
      if (existingUser) {
         throw new ConflictException(USER_ERROR_CODES.USER_ALREADY_EXISTS, {
            params: { userId: data.userId },
         });
      }

      // Check username uniqueness
      if (data.username) {
         const existingUsername = await this.userRepository.findByUsername(data.username);
         if (existingUsername) {
            throw new ConflictException(USER_ERROR_CODES.USERNAME_ALREADY_TAKEN, {
               params: { username: data.username },
            });
         }
      }

      // Create user
      const user = await this.userRepository.create({
         userId: data.userId,
         email: data.email,
         username: data.username,
         displayName: data.displayName,
      });

      // Sync user to graph
      await this.userGraphSyncService.syncUserToGraph(user);

      // Publish event
      await this.outboxService.createOutboxEvent(user.id, 'User', 'UserCreated', {
         userId: user.userId,
         email: user.email,
         username: user.username,
      });

      return user;
   }

   async getUserById(id: string): Promise<UserEntity> {
      const user = await this.userRepository.findById(id);
      if (!user) {
         throw new NotFoundException(USER_ERROR_CODES.USER_NOT_FOUND, {
            params: { id },
         });
      }
      return user;
   }

   async getUserByUserId(userId: string): Promise<UserEntity> {
      const user = await this.userRepository.findByUserId(userId);
      if (!user) {
         throw new NotFoundException(USER_ERROR_CODES.USER_NOT_FOUND, {
            params: { userId },
         });
      }
      return user;
   }

   async getUserByUsername(username: string): Promise<UserEntity> {
      const user = await this.userRepository.findByUsername(username);
      if (!user) {
         throw new NotFoundException(USER_ERROR_CODES.USER_NOT_FOUND, {
            params: { username },
         });
      }
      return user;
   }

   async updateUserProfile(
      id: string,
      data: {
         displayName?: string;
         bio?: string;
         avatar?: string;
         coverImage?: string;
         website?: string;
         location?: string;
         dateOfBirth?: Date;
         gender?: Gender;
      },
   ): Promise<UserEntity> {
      const user = await this.getUserById(id);

      const updatedUser = await this.userRepository.update(id, data);

      // Sync updated user to graph
      await this.userGraphSyncService.syncUserToGraph(updatedUser);

      // Publish event
      await this.outboxService.createOutboxEvent(user.id, 'User', 'UserProfileUpdated', {
         userId: user.userId,
         changes: data,
      });

      return updatedUser;
   }

   async updateUsername(id: string, username: string): Promise<UserEntity> {
      const existingUsername = await this.userRepository.findByUsername(username);
      if (existingUsername && existingUsername.id !== id) {
         throw new ConflictException(USER_ERROR_CODES.USERNAME_ALREADY_TAKEN, {
            params: { username },
         });
      }

      const updatedUser = await this.userRepository.update(id, { username });

      // Sync updated user to graph
      await this.userGraphSyncService.syncUserToGraph(updatedUser);

      return updatedUser;
   }

   async deleteUser(id: string): Promise<UserEntity> {
      const user = await this.getUserById(id);

      const deletedUser = await this.userRepository.softDelete(id);

      // Publish event
      await this.outboxService.createOutboxEvent(user.id, 'User', 'UserDeleted', {
         userId: user.userId,
      });

      return deletedUser;
   }

   async restoreUser(id: string): Promise<UserEntity> {
      const restoredUser = await this.userRepository.restore(id);

      // Publish event
      await this.outboxService.createOutboxEvent(restoredUser.id, 'User', 'UserRestored', {
         userId: restoredUser.userId,
      });

      return restoredUser;
   }

   // Follow/Unfollow Management - Now using NebulaGraph
   async followUser(followerId: string, followingId: string): Promise<FollowEntity> {
      if (followerId === followingId) {
         throw new BadRequestException(USER_ERROR_CODES.CANNOT_FOLLOW_YOURSELF);
      }

      // Check if users exist
      const follower = await this.getUserById(followerId);
      const following = await this.getUserById(followingId);

      // Check if already following in graph
      const existingFollow = await this.graphFollowRepository.findFollow(followerId, followingId);
      if (existingFollow) {
         throw new ConflictException(USER_ERROR_CODES.ALREADY_FOLLOWING, {
            params: { followerId, followingId },
         });
      }

      const status = following.isPrivate ? FollowStatus.PENDING : FollowStatus.ACCEPTED;

      // Create follow in PostgreSQL (for backward compatibility)
      const follow = await this.followRepository.create({
         follower: { connect: { id: followerId } },
         following: { connect: { id: followingId } },
         status,
      });

      // Create follow in NebulaGraph
      await this.graphFollowRepository.createFollow(followerId, followingId, status);

      // Update counts if accepted
      if (status === FollowStatus.ACCEPTED) {
         await this.userRepository.incrementFollowingCount(followerId);
         await this.userRepository.incrementFollowersCount(followingId);
      }

      // Publish event
      await this.outboxService.createOutboxEvent(follow.id, 'Follow', 'UserFollowed', {
         followerId: follower.userId,
         followingId: following.userId,
         status: follow.status,
      });

      return follow;
   }

   async unfollowUser(followerId: string, followingId: string): Promise<void> {
      const follow = await this.followRepository.findByFollowerAndFollowing(followerId, followingId);
      if (!follow) {
         throw new NotFoundException(USER_ERROR_CODES.FOLLOW_NOT_FOUND, {
            params: { followerId, followingId },
         });
      }

      // Soft delete in PostgreSQL
      await this.followRepository.softDelete(follow.id);

      // Delete in NebulaGraph
      await this.graphFollowRepository.deleteFollow(followerId, followingId);

      // Update counts if was accepted
      if (follow.status === FollowStatus.ACCEPTED) {
         await this.userRepository.decrementFollowingCount(followerId);
         await this.userRepository.decrementFollowersCount(followingId);
      }

      // Publish event
      const follower = await this.getUserById(followerId);
      const following = await this.getUserById(followingId);

      await this.outboxService.createOutboxEvent(follow.id, 'Follow', 'UserUnfollowed', {
         followerId: follower.userId,
         followingId: following.userId,
      });
   }

   async acceptFollowRequest(followId: string): Promise<FollowEntity> {
      const follow = await this.followRepository.findById(followId);
      if (!follow) {
         throw new NotFoundException(USER_ERROR_CODES.FOLLOW_REQUEST_NOT_FOUND, {
            params: { followId },
         });
      }

      if (follow.status !== FollowStatus.PENDING) {
         throw new BadRequestException(USER_ERROR_CODES.FOLLOW_REQUEST_NOT_PENDING, {
            params: { followId, status: follow.status },
         });
      }

      // Update in PostgreSQL
      const updatedFollow = await this.followRepository.updateStatus(followId, FollowStatus.ACCEPTED);

      // Update in NebulaGraph
      await this.graphFollowRepository.updateFollowStatus(follow.followerId, follow.followingId, FollowStatus.ACCEPTED);

      // Update counts
      await this.userRepository.incrementFollowingCount(follow.followerId);
      await this.userRepository.incrementFollowersCount(follow.followingId);

      // Publish event
      await this.outboxService.createOutboxEvent(follow.id, 'Follow', 'FollowRequestAccepted', {
         followerId: follow.followerId,
         followingId: follow.followingId,
      });

      return updatedFollow;
   }

   async rejectFollowRequest(followId: string): Promise<FollowEntity> {
      const follow = await this.followRepository.findById(followId);
      if (!follow) {
         throw new NotFoundException(USER_ERROR_CODES.FOLLOW_REQUEST_NOT_FOUND, {
            params: { followId },
         });
      }

      if (follow.status !== FollowStatus.PENDING) {
         throw new BadRequestException(USER_ERROR_CODES.FOLLOW_REQUEST_NOT_PENDING, {
            params: { followId, status: follow.status },
         });
      }

      // Update in PostgreSQL
      const updatedFollow = await this.followRepository.updateStatus(followId, FollowStatus.REJECTED);

      // Update in NebulaGraph
      await this.graphFollowRepository.updateFollowStatus(follow.followerId, follow.followingId, FollowStatus.REJECTED);

      // Publish event
      await this.outboxService.createOutboxEvent(follow.id, 'Follow', 'FollowRequestRejected', {
         followerId: follow.followerId,
         followingId: follow.followingId,
      });

      return updatedFollow;
   }

   // Get followers/following - Now using NebulaGraph for queries
   async getFollowers(userId: string, status?: FollowStatus, skip = 0, take = 20): Promise<FollowEntity[]> {
      await this.getUserById(userId);

      // Query from NebulaGraph for better performance
      const graphResults = await this.graphFollowRepository.getFollowers(userId, status, skip, take);

      // Convert graph results to FollowEntity format
      return graphResults.map((result) => {
         const follow = new FollowEntity({
            id: `${result.followerId}-${result.followingId}`,
            followerId: result.followerId,
            followingId: result.followingId,
            status: result.status,
            createdAt: result.createdAt,
            updatedAt: result.updatedAt,
            deletedAt: null,
         });
         return follow;
      });
   }

   async getFollowing(userId: string, status?: FollowStatus, skip = 0, take = 20): Promise<FollowEntity[]> {
      await this.getUserById(userId);

      // Query from NebulaGraph for better performance
      const graphResults = await this.graphFollowRepository.getFollowing(userId, status, skip, take);

      // Convert graph results to FollowEntity format
      return graphResults.map((result) => {
         const follow = new FollowEntity({
            id: `${result.followerId}-${result.followingId}`,
            followerId: result.followerId,
            followingId: result.followingId,
            status: result.status,
            createdAt: result.createdAt,
            updatedAt: result.updatedAt,
            deletedAt: null,
         });
         return follow;
      });
   }

   async getFollowersCount(userId: string, status?: FollowStatus): Promise<number> {
      await this.getUserById(userId);
      return this.graphFollowRepository.countFollowers(userId, status);
   }

   async getFollowingCount(userId: string, status?: FollowStatus): Promise<number> {
      await this.getUserById(userId);
      return this.graphFollowRepository.countFollowing(userId, status);
   }

   // Advanced graph queries
   async getMutualFollowers(userId1: string, userId2: string): Promise<string[]> {
      await this.getUserById(userId1);
      await this.getUserById(userId2);
      return this.graphFollowRepository.getMutualFollowers(userId1, userId2);
   }

   async getFollowSuggestions(userId: string, limit = 10): Promise<string[]> {
      await this.getUserById(userId);
      return this.graphFollowRepository.getFollowSuggestions(userId, limit);
   }
}
