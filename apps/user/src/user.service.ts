import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException, ConflictException, NotFoundException, USER_ERROR_CODES } from '@common';
import { UserRepository, FollowRepository } from '@user/repositories';
import { UserEntity, FollowEntity, FollowStatus, Gender } from '@user/entities';
import { OutboxService } from '@user/outbox';
import { GraphFollowRepository } from '@user/graph';
import { UserGraphSyncService, UsernameBloomFilterService } from '@user/services';
import { UserSearchService } from '@user/search';

@Injectable()
export class UserService {
   private readonly logger = new Logger(UserService.name);

   constructor(
      private readonly userRepository: UserRepository,
      private readonly followRepository: FollowRepository,
      private readonly outboxService: OutboxService,
      private readonly graphFollowRepository: GraphFollowRepository,
      private readonly userGraphSyncService: UserGraphSyncService,
      private readonly usernameBloomFilterService: UsernameBloomFilterService,
      private readonly userSearchService: UserSearchService,
   ) {}

   async checkUsername(username: string): Promise<{ available: boolean; username: string }> {
      const normalizedUsername = username.toLowerCase().trim();
      const available = await this.usernameBloomFilterService.isUsernameAvailable(normalizedUsername);
      return { available, username: normalizedUsername };
   }

   // User Profile Management
   async createUser(data: { userId: string; username?: string; displayName?: string }): Promise<UserEntity> {
      // Check if user already exists
      const existingUser = await this.userRepository.findByUserId(data.userId);
      if (existingUser) {
         throw new ConflictException(USER_ERROR_CODES.USER_ALREADY_EXISTS, {
            params: { userId: data.userId },
         });
      }

      // Check username uniqueness using Bloom Filter first
      if (data.username) {
         const normalizedUsername = data.username.toLowerCase().trim();
         const mightExist = await this.usernameBloomFilterService.mightContain(normalizedUsername);
         if (mightExist) {
            const existingUsername = await this.userRepository.findByUsername(normalizedUsername);
            if (existingUsername) {
               throw new ConflictException(USER_ERROR_CODES.USERNAME_ALREADY_TAKEN, {
                  params: { username: data.username },
               });
            }
         }
      }

      // Create user
      const user = await this.userRepository.create({
         userId: data.userId,
         username: data.username,
         displayName: data.displayName,
      });

      // Register username in Bloom Filter
      if (user.username) {
         await this.usernameBloomFilterService.addUsername(user.username);
      }

      // Sync user to graph
      try {
         await this.userGraphSyncService.syncUserToGraph(user);
      } catch (err) {
         this.logger.warn(`Failed to sync newly created user ${user.id} to graph: ${String(err)}`);
      }

      // Sync user to Elasticsearch
      try {
         await this.userSearchService.indexUser(user);
      } catch (err) {
         this.logger.warn(`Failed to sync newly created user ${user.id} to Elasticsearch: ${String(err)}`);
      }

      // Publish event
      await this.outboxService.createOutboxEvent(user.id, 'User', 'UserCreated', {
         userId: user.userId,
         username: user.username,
      });

      return user;
   }

   async handleUserRegistered(data: {
      userId?: string;
      accountId?: string;
      email?: string;
   }): Promise<UserEntity | null> {
      const targetUserId = data.userId || data.accountId;
      if (!targetUserId) {
         return null;
      }
      const existing = await this.userRepository.findByUserId(targetUserId);
      if (existing) {
         return existing;
      }

      let username: string | undefined;
      const displayName = data.email ? data.email.split('@')[0] : undefined;

      if (displayName) {
         const baseUsername = displayName.toLowerCase().trim();
         const isAvailable = await this.usernameBloomFilterService.isUsernameAvailable(baseUsername);
         if (isAvailable) {
            username = baseUsername;
         } else {
            const randomSuffix = Math.floor(1000 + Math.random() * 9000);
            username = `${baseUsername}_${randomSuffix}`;
         }
      }

      return this.createUser({
         userId: targetUserId,
         username,
         displayName,
      });
   }

   async getUserById(id: string): Promise<UserEntity> {
      let user = await this.userRepository.findById(id);
      if (!user) {
         user = await this.userRepository.findByUserId(id);
      }
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
         username?: string;
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
      let user = await this.userRepository.findById(id);
      if (!user) {
         user = await this.userRepository.findByUserId(id);
      }

      // If user does not exist in User service DB yet, auto-create it with the provided profile data!
      if (!user) {
         this.logger.log(`User ${id} not found during profile update; auto-creating initial user and profile`);
         if (data.username) {
            const normalizedUsername = data.username.toLowerCase().trim();
            const mightExist = await this.usernameBloomFilterService.mightContain(normalizedUsername);
            if (mightExist) {
               const existingUsername = await this.userRepository.findByUsername(normalizedUsername);
               if (existingUsername) {
                  throw new ConflictException(USER_ERROR_CODES.USERNAME_ALREADY_TAKEN, {
                     params: { username: data.username },
                  });
               }
            }
         }

         user = await this.userRepository.create({
            userId: id,
            username: data.username,
            displayName: data.displayName,
            bio: data.bio,
            avatar: data.avatar,
            coverImage: data.coverImage,
            website: data.website,
            location: data.location,
            dateOfBirth: data.dateOfBirth,
            gender: data.gender,
         });

         if (user.username) {
            await this.usernameBloomFilterService.addUsername(user.username);
         }

         // Sync to graph
         try {
            await this.userGraphSyncService.syncUserToGraph(user);
         } catch (err) {
            this.logger.warn(`Failed to sync newly created user ${user.id} to graph: ${String(err)}`);
         }

         // Sync to Elasticsearch
         try {
            await this.userSearchService.indexUser(user);
         } catch (err) {
            this.logger.warn(`Failed to sync newly created user ${user.id} to Elasticsearch: ${String(err)}`);
         }

         return user;
      }

      // If user exists, check username conflict using Bloom filter
      if (data.username && data.username.toLowerCase().trim() !== user.username?.toLowerCase().trim()) {
         const normalizedUsername = data.username.toLowerCase().trim();
         const mightExist = await this.usernameBloomFilterService.mightContain(normalizedUsername);
         if (mightExist) {
            const existingUsername = await this.userRepository.findByUsername(normalizedUsername);
            if (existingUsername && existingUsername.id !== user.id) {
               throw new ConflictException(USER_ERROR_CODES.USERNAME_ALREADY_TAKEN, {
                  params: { username: data.username },
               });
            }
         }
      }

      const updatedUser = await this.userRepository.update(user.id, data);

      if (updatedUser.username) {
         await this.usernameBloomFilterService.addUsername(updatedUser.username);
      }

      // Sync updated user to graph
      try {
         await this.userGraphSyncService.syncUserToGraph(updatedUser);
      } catch (err) {
         this.logger.warn(`Failed to sync updated user ${user.id} to graph: ${String(err)}`);
      }

      // Sync updated user to Elasticsearch
      try {
         await this.userSearchService.indexUser(updatedUser);
      } catch (err) {
         this.logger.warn(`Failed to sync updated user ${user.id} to Elasticsearch: ${String(err)}`);
      }

      // Publish event
      await this.outboxService.createOutboxEvent(user.id, 'User', 'UserProfileUpdated', {
         userId: user.userId,
         changes: data,
      });

      return updatedUser;
   }

   async updateUsername(id: string, username: string): Promise<UserEntity> {
      const user = await this.getUserById(id);
      const normalizedUsername = username.toLowerCase().trim();

      if (normalizedUsername !== user.username?.toLowerCase().trim()) {
         const mightExist = await this.usernameBloomFilterService.mightContain(normalizedUsername);
         if (mightExist) {
            const existingUsername = await this.userRepository.findByUsername(normalizedUsername);
            if (existingUsername && existingUsername.id !== user.id) {
               throw new ConflictException(USER_ERROR_CODES.USERNAME_ALREADY_TAKEN, {
                  params: { username },
               });
            }
         }
      }

      const updatedUser = await this.userRepository.update(user.id, { username });

      if (updatedUser.username) {
         await this.usernameBloomFilterService.addUsername(updatedUser.username);
      }

      // Sync updated user to graph
      try {
         await this.userGraphSyncService.syncUserToGraph(updatedUser);
      } catch (err) {
         this.logger.warn(`Failed to sync updated username for ${user.id} to graph: ${String(err)}`);
      }

      // Sync updated user to Elasticsearch
      try {
         await this.userSearchService.indexUser(updatedUser);
      } catch (err) {
         this.logger.warn(`Failed to sync updated username for ${user.id} to Elasticsearch: ${String(err)}`);
      }

      return updatedUser;
   }

   async deleteUser(id: string): Promise<UserEntity> {
      const user = await this.getUserById(id);

      const deletedUser = await this.userRepository.softDelete(user.id);

      // Remove from Elasticsearch
      try {
         await this.userSearchService.deleteUser(user.id);
      } catch (err) {
         this.logger.warn(`Failed to delete user ${user.id} from Elasticsearch: ${String(err)}`);
      }

      // Publish event
      await this.outboxService.createOutboxEvent(user.id, 'User', 'UserDeleted', {
         userId: user.userId,
      });

      return deletedUser;
   }

   async restoreUser(id: string): Promise<UserEntity> {
      const restoredUser = await this.userRepository.restore(id);

      // Re-index to Elasticsearch
      try {
         await this.userSearchService.indexUser(restoredUser);
      } catch (err) {
         this.logger.warn(`Failed to re-index restored user ${restoredUser.id} to Elasticsearch: ${String(err)}`);
      }

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
      const existingFollow = await this.graphFollowRepository.findFollow(follower.id, following.id);
      if (existingFollow) {
         throw new ConflictException(USER_ERROR_CODES.ALREADY_FOLLOWING, {
            params: { followerId, followingId },
         });
      }

      const status = following.isPrivate ? FollowStatus.PENDING : FollowStatus.ACCEPTED;

      // Create follow in PostgreSQL (for backward compatibility)
      const follow = await this.followRepository.create({
         follower: { connect: { id: follower.id } },
         following: { connect: { id: following.id } },
         status,
      });

      // Create follow in NebulaGraph
      await this.graphFollowRepository.createFollow(follower.id, following.id, status);

      // Update counts if accepted
      if (status === FollowStatus.ACCEPTED) {
         await this.userRepository.incrementFollowingCount(follower.id);
         await this.userRepository.incrementFollowersCount(following.id);
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
      const follower = await this.getUserById(followerId);
      const following = await this.getUserById(followingId);

      const follow = await this.followRepository.findByFollowerAndFollowing(follower.id, following.id);
      if (!follow) {
         throw new NotFoundException(USER_ERROR_CODES.FOLLOW_NOT_FOUND, {
            params: { followerId, followingId },
         });
      }

      // Soft delete in PostgreSQL
      await this.followRepository.softDelete(follow.id);

      // Delete in NebulaGraph
      await this.graphFollowRepository.deleteFollow(follower.id, following.id);

      // Update counts if was accepted
      if (follow.status === FollowStatus.ACCEPTED) {
         await this.userRepository.decrementFollowingCount(follower.id);
         await this.userRepository.decrementFollowersCount(following.id);
      }

      // Publish event
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
      const user = await this.getUserById(userId);

      // Query from NebulaGraph for better performance
      const graphResults = await this.graphFollowRepository.getFollowers(user.id, status, skip, take);

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
      const user = await this.getUserById(userId);

      // Query from NebulaGraph for better performance
      const graphResults = await this.graphFollowRepository.getFollowing(user.id, status, skip, take);

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
      const user = await this.getUserById(userId);
      return this.graphFollowRepository.countFollowers(user.id, status);
   }

   async getFollowingCount(userId: string, status?: FollowStatus): Promise<number> {
      const user = await this.getUserById(userId);
      return this.graphFollowRepository.countFollowing(user.id, status);
   }

   // Advanced graph queries
   async getMutualFollowers(userId1: string, userId2: string): Promise<string[]> {
      const user1 = await this.getUserById(userId1);
      const user2 = await this.getUserById(userId2);
      return this.graphFollowRepository.getMutualFollowers(user1.id, user2.id);
   }

   async getFollowSuggestions(userId: string, limit = 10): Promise<string[]> {
      const user = await this.getUserById(userId);
      return this.graphFollowRepository.getFollowSuggestions(user.id, limit);
   }

   // Elasticsearch User Search
   async searchUsers(query: string, limit = 10, skip = 0) {
      return this.userSearchService.searchUsers(query, limit, skip);
   }
}
