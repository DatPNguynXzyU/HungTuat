import { Injectable, Logger } from '@nestjs/common';
import {
   BadRequestException,
   ConflictException,
   NotFoundException,
   USER_ERROR_CODES,
   UserDateOfBirthResponseDto,
   CloudinaryService,
   ICursorPaginationMeta,
   UserSearchResultItemDto,
   UserSuggestionItemDto,
} from '@common';
import { Prisma } from '@user/prisma-client';
import { UserRepository, FollowRepository, CreateUserData } from '@user/repositories';
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
      private readonly cloudinaryService: CloudinaryService,
   ) {}

   async checkUsername(username: string): Promise<{ available: boolean; username: string }> {
      const normalizedUsername = username.toLowerCase().trim();
      const available = await this.usernameBloomFilterService.isUsernameAvailable(normalizedUsername);
      return { available, username: normalizedUsername };
   }

   async createUser(data: CreateUserData): Promise<UserEntity> {
      const existingUser = await this.userRepository.findByAccountId(data.accountId);
      if (existingUser) {
         throw new ConflictException(USER_ERROR_CODES.USER_ALREADY_EXISTS, {
            params: { accountId: data.accountId },
         });
      }

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

      let user: UserEntity;
      try {
         user = await this.userRepository.create(data);
      } catch (err: unknown) {
         const errCode = (err as { code?: string })?.code;
         const errMsg = err instanceof Error ? err.message : String(err);
         const target = (err as { meta?: { target?: string[] | string } })?.meta?.target;
         const targetStr = Array.isArray(target) ? target.join(',') : String(target || '');

         if (
            (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') ||
            errCode === 'P2002' ||
            errMsg.includes('Unique constraint failed')
         ) {
            if (
               targetStr.includes('account_id') ||
               targetStr.includes('accountId') ||
               errMsg.includes('users_account_id_key')
            ) {
               throw new ConflictException(USER_ERROR_CODES.USER_ALREADY_EXISTS, {
                  params: { accountId: data.accountId },
               });
            }
            if (targetStr.includes('username') || errMsg.includes('users_username_key')) {
               throw new ConflictException(USER_ERROR_CODES.USERNAME_ALREADY_TAKEN, {
                  params: { username: data.username },
               });
            }
            throw new ConflictException(USER_ERROR_CODES.USER_ALREADY_EXISTS);
         }
         throw err;
      }

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

      await this.outboxService.createOutboxEvent(user.id, 'User', 'UserCreated', {
         userId: user.id,
         accountId: user.accountId,
         username: user.username,
      });

      return user;
   }

   async handleUserRegistered(data: { accountId: string; email?: string }): Promise<UserEntity | null> {
      if (!data.accountId) {
         return null;
      }
      const existing = await this.userRepository.findByAccountId(data.accountId);
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

      try {
         return await this.createUser({
            accountId: data.accountId,
            username,
            displayName,
         });
      } catch (err: unknown) {
         // Concurrency check: If another process created the user for this accountId in the meantime, return it
         const createdUser = await this.userRepository.findByAccountId(data.accountId);
         if (createdUser) {
            return createdUser;
         }

         // If failure was due to username collision, retry with a unique suffix
         if (err instanceof ConflictException && displayName && username) {
            const retryUsername = `${displayName.toLowerCase().trim()}_${Math.floor(10000 + Math.random() * 90000)}`;
            try {
               return await this.createUser({
                  accountId: data.accountId,
                  username: retryUsername,
                  displayName,
               });
            } catch {
               const finalCheck = await this.userRepository.findByAccountId(data.accountId);
               if (finalCheck) {
                  return finalCheck;
               }
            }
         }

         throw err;
      }
   }

   async getUserById(id: string): Promise<UserEntity> {
      let user = await this.userRepository.findById(id);
      if (!user) {
         user = await this.userRepository.findByAccountId(id);
      }
      if (!user) {
         throw new NotFoundException(USER_ERROR_CODES.USER_NOT_FOUND, {
            params: { id },
         });
      }
      return user;
   }

   async getUserByAccountId(accountId: string): Promise<UserEntity> {
      const user = await this.userRepository.findByAccountId(accountId);
      if (!user) {
         throw new NotFoundException(USER_ERROR_CODES.USER_NOT_FOUND, {
            params: { accountId },
         });
      }
      return user;
   }

   async getUserByUserId(userId: string): Promise<UserEntity> {
      return this.getUserById(userId);
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

   calculateAge(dob?: Date | string | null): number | null {
      if (!dob) {
         return null;
      }
      const birthDate = new Date(dob);
      if (isNaN(birthDate.getTime())) {
         return null;
      }
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
         age--;
      }
      return age >= 0 ? age : null;
   }

   async getDateOfBirth(userId: string): Promise<UserDateOfBirthResponseDto> {
      const record = await this.userRepository.findDateOfBirth(userId);
      if (!record) {
         throw new NotFoundException(USER_ERROR_CODES.USER_NOT_FOUND, {
            params: { userId },
         });
      }

      return {
         userId: record.userId,
         dateOfBirth: record.dateOfBirth,
         age: this.calculateAge(record.dateOfBirth),
      };
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
         user = await this.userRepository.findByAccountId(id);
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
            accountId: id,
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
         userId: user.id,
         accountId: user.accountId,
         changes: data,
      });

      return updatedUser;
   }

   async updateUsername(userId: string, username: string): Promise<UserEntity> {
      const user = await this.getUserById(userId);
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

   async deleteUser(userId: string): Promise<UserEntity> {
      const user = await this.getUserById(userId);

      const deletedUser = await this.userRepository.softDelete(user.id);

      // Remove from Elasticsearch
      try {
         await this.userSearchService.deleteUser(user.id);
      } catch (err) {
         this.logger.warn(`Failed to delete user ${user.id} from Elasticsearch: ${String(err)}`);
      }

      // Publish event
      await this.outboxService.createOutboxEvent(user.id, 'User', 'UserDeleted', {
         userId: user.id,
         accountId: user.accountId,
      });

      return deletedUser;
   }

   async restoreUser(userId: string): Promise<UserEntity> {
      const restoredUser = await this.userRepository.restore(userId);

      // Re-index to Elasticsearch
      try {
         await this.userSearchService.indexUser(restoredUser);
      } catch (err) {
         this.logger.warn(`Failed to re-index restored user ${restoredUser.id} to Elasticsearch: ${String(err)}`);
      }

      // Publish event
      await this.outboxService.createOutboxEvent(restoredUser.id, 'User', 'UserRestored', {
         userId: restoredUser.id,
         accountId: restoredUser.accountId,
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
         follower: { connect: { userId: follower.userId } },
         following: { connect: { userId: following.userId } },
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
      await this.outboxService.createOutboxEvent(follow.followId, 'Follow', 'UserFollowed', {
         followerId: follower.id,
         followingId: following.id,
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
      await this.followRepository.softDelete(follow.followId);

      // Delete in NebulaGraph
      await this.graphFollowRepository.deleteFollow(follower.id, following.id);

      // Update counts if was accepted
      if (follow.status === FollowStatus.ACCEPTED) {
         await this.userRepository.decrementFollowingCount(follower.id);
         await this.userRepository.decrementFollowersCount(following.id);
      }

      // Publish event
      await this.outboxService.createOutboxEvent(follow.followId, 'Follow', 'UserUnfollowed', {
         followerId: follower.id,
         followingId: following.id,
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
      await this.outboxService.createOutboxEvent(follow.followId, 'Follow', 'FollowRequestAccepted', {
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
      await this.outboxService.createOutboxEvent(follow.followId, 'Follow', 'FollowRequestRejected', {
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
            followId: `${result.followerId}-${result.followingId}`,
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
            followId: `${result.followerId}-${result.followingId}`,
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

   async getFollowSuggestions(userId: string, limit = 10): Promise<UserSuggestionItemDto[]> {
      const user = await this.getUserById(userId);

      // Get IDs of users current user is already following
      const followingList = await this.followRepository.findFollowing(user.id, FollowStatus.ACCEPTED, 0, 1000);
      const alreadyFollowingIds = new Set(followingList.map((f) => f.followingId));
      alreadyFollowingIds.add(user.id);

      // Query Graph DB for 2-hop suggestions (friends of friends)
      let graphCandidateIds: string[] = [];
      try {
         const rawGraphIds = await this.graphFollowRepository.getFollowSuggestions(user.id, limit * 2);
         graphCandidateIds = rawGraphIds.filter((id) => !alreadyFollowingIds.has(id));
      } catch (err) {
         this.logger.warn(`Failed to retrieve graph follow suggestions for ${user.id}: ${String(err)}`);
      }

      const selectedGraphIds = Array.from(new Set(graphCandidateIds)).slice(0, limit);
      const graphIdSet = new Set(selectedGraphIds);

      // Fallback: If graph didn't find enough candidates, fetch top popular users (Cold-start)
      let popularUsers: UserEntity[] = [];
      const neededCount = limit - selectedGraphIds.length;
      if (neededCount > 0) {
         const excludeIds = Array.from(new Set([...alreadyFollowingIds, ...selectedGraphIds]));
         popularUsers = await this.userRepository.findTopUsers(neededCount, excludeIds);
      }

      // Batch fetch entities for graph candidate IDs
      const graphUserEntities =
         selectedGraphIds.length > 0 ? await this.userRepository.findByIds(selectedGraphIds) : [];

      const allCandidateEntities = [...graphUserEntities, ...popularUsers];
      if (allCandidateEntities.length === 0) {
         return [];
      }

      // Fetch relations & mutual followers count
      const candidateIds = allCandidateEntities.map((u) => u.id);
      const { followerSet } = await this.followRepository.findFollowRelations(user.id, candidateIds);

      const mutualCounts = new Map<string, number>();
      await Promise.all(
         allCandidateEntities.map(async (candidate) => {
            if (graphIdSet.has(candidate.id)) {
               try {
                  const mutuals = await this.graphFollowRepository.getMutualFollowers(user.id, candidate.id);
                  mutualCounts.set(candidate.id, mutuals.length);
               } catch {
                  mutualCounts.set(candidate.id, 0);
               }
            } else {
               mutualCounts.set(candidate.id, 0);
            }
         }),
      );

      // Map to UserSuggestionItemDto
      return allCandidateEntities.map((candidate): UserSuggestionItemDto => {
         const isGraphCandidate = graphIdSet.has(candidate.id);
         return {
            id: candidate.id,
            username: candidate.username,
            displayName: candidate.displayName,
            avatar: candidate.avatar,
            bio: candidate.bio,
            isVerified: candidate.settings?.isVerified ?? false,
            followersCount: candidate.stats?.followersCount ?? 0,
            followingCount: candidate.stats?.followingCount ?? 0,
            mutualCount: mutualCounts.get(candidate.id) ?? 0,
            isFollowing: false,
            isFollower: followerSet.has(candidate.id),
            reason: isGraphCandidate ? 'mutual_friends' : 'popular',
         };
      });
   }

   // Elasticsearch User Search
   async searchUsers(
      query: string,
      limit = 10,
      cursor?: string,
      currentUserId?: string,
   ): Promise<{ items: UserSearchResultItemDto[]; meta: ICursorPaginationMeta }> {
      const {
         items: esUsers,
         nextCursor,
         hasMore,
         total,
      } = await this.userSearchService.searchUsers(query, limit, cursor);

      if (esUsers.length === 0) {
         return {
            items: [],
            meta: {
               nextCursor: null,
               hasMore: false,
               limit,
               total: total ?? 0,
            },
         };
      }

      let resolvedCurrentUserId = currentUserId;
      if (currentUserId) {
         try {
            const currentUser = await this.getUserById(currentUserId);
            resolvedCurrentUserId = currentUser.id;
         } catch {
            // Keep currentUserId as-is
         }
      }

      const targetUserIds = esUsers.map((u) => u.id);
      let followingSet = new Set<string>();
      let followerSet = new Set<string>();

      if (resolvedCurrentUserId) {
         const relations = await this.followRepository.findFollowRelations(resolvedCurrentUserId, targetUserIds);
         followingSet = relations.followingSet;
         followerSet = relations.followerSet;
      }

      const items: UserSearchResultItemDto[] = esUsers.map((user) => ({
         id: user.id,
         username: user.username,
         displayName: user.displayName,
         avatar: user.avatar,
         bio: user.bio,
         isVerified: user.isVerified ?? false,
         followersCount: user.followersCount ?? 0,
         followingCount: user.followingCount ?? 0,
         isFollowing: resolvedCurrentUserId ? followingSet.has(user.id) : false,
         isFollower: resolvedCurrentUserId ? followerSet.has(user.id) : false,
         isSelf: resolvedCurrentUserId ? resolvedCurrentUserId === user.id : false,
      }));

      return {
         items,
         meta: {
            nextCursor,
            hasMore,
            limit,
            total,
         },
      };
   }

   // Cloudinary Avatar Management
   async uploadAvatar(
      id: string,
      base64Data: string,
      mimeType?: string,
   ): Promise<{ avatarUrl: string; publicId: string; user: UserEntity }> {
      const user = await this.getUserById(id);

      this.logger.log(`Uploading avatar to Cloudinary for user ${user.id}...`);
      const formattedBase64 =
         mimeType && !base64Data.startsWith('data:') ? `data:${mimeType};base64,${base64Data}` : base64Data;

      const uploadResult = await this.cloudinaryService.uploadBase64(formattedBase64, {
         folder: 'omni/users/avatars',
         public_id: `avatar_${user.id}_${Date.now()}`,
         transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto', fetch_format: 'auto' },
         ],
         tags: ['avatar', user.id, user.accountId],
      });

      const updatedUser = await this.updateUserProfile(user.id, {
         avatar: uploadResult.secureUrl,
      });

      return {
         avatarUrl: uploadResult.secureUrl,
         publicId: uploadResult.publicId,
         user: updatedUser,
      };
   }

   async getAvatarUploadSignature(userId: string) {
      const user = await this.getUserById(userId);
      return this.cloudinaryService.generateUploadSignature({
         folder: 'omni/users/avatars',
         tags: `avatar,${user.id},${user.accountId}`,
      });
   }
}
