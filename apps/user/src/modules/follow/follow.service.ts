import { Inject, Injectable, Logger } from '@nestjs/common';
import {
   BadRequestException,
   ConflictException,
   NotFoundException,
   USER_ERROR_CODES,
   UserSuggestionItemDto,
} from '@common';
import { OutboxService } from '@user/core/outbox';
import { FollowEntity, FollowStatus, UserEntity } from '@user/core/database/entities';
import {
   UserProfileRepository,
   USER_PROFILE_REPOSITORY,
} from '@user/modules/profile/repositories/user-profile.repository';
import { FollowRepository, FOLLOW_REPOSITORY } from './repositories/follow.repository';
import { FollowGraphRepository, GRAPH_FOLLOW_REPOSITORY } from './repositories/follow-graph.repository';

@Injectable()
export class FollowService {
   private readonly logger = new Logger(FollowService.name);

   constructor(
      @Inject(USER_PROFILE_REPOSITORY)
      private readonly userProfileRepository: UserProfileRepository,
      @Inject(FOLLOW_REPOSITORY)
      private readonly followRepository: FollowRepository,
      @Inject(GRAPH_FOLLOW_REPOSITORY)
      private readonly graphFollowRepository: FollowGraphRepository,
      private readonly outboxService: OutboxService,
   ) {}

   private async getUserById(id: string): Promise<UserEntity> {
      let user = await this.userProfileRepository.findById(id);
      if (!user) {
         user = await this.userProfileRepository.findByAccountId(id);
      }
      if (!user) {
         throw new NotFoundException(USER_ERROR_CODES.USER_NOT_FOUND, {
            params: { id },
         });
      }
      return user;
   }

   async followUser(followerId: string, followingId: string): Promise<FollowEntity> {
      if (followerId === followingId) {
         throw new BadRequestException(USER_ERROR_CODES.CANNOT_FOLLOW_YOURSELF);
      }

      const follower = await this.getUserById(followerId);
      const following = await this.getUserById(followingId);

      const existingFollow = await this.graphFollowRepository.findFollow(follower.id, following.id);
      if (existingFollow) {
         throw new ConflictException(USER_ERROR_CODES.ALREADY_FOLLOWING, {
            params: { followerId, followingId },
         });
      }

      const status = following.isPrivate ? FollowStatus.PENDING : FollowStatus.ACCEPTED;

      const follow = await this.followRepository.create({
         follower: { connect: { userId: follower.userId } },
         following: { connect: { userId: following.userId } },
         status,
      });

      await this.graphFollowRepository.createFollow(follower.id, following.id, status);

      if (status === FollowStatus.ACCEPTED) {
         await this.userProfileRepository.incrementFollowingCount(follower.id);
         await this.userProfileRepository.incrementFollowersCount(following.id);
      }

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

      await this.followRepository.softDelete(follow.followId);
      await this.graphFollowRepository.deleteFollow(follower.id, following.id);

      if (follow.status === FollowStatus.ACCEPTED) {
         await this.userProfileRepository.decrementFollowingCount(follower.id);
         await this.userProfileRepository.decrementFollowersCount(following.id);
      }

      await this.outboxService.createOutboxEvent(follow.followId, 'Follow', 'UserUnfollowed', {
         followerId: follower.id,
         followingId: following.id,
      });
   }

   async acceptFollowRequest(followId: string): Promise<FollowEntity> {
      const follow = await this.followRepository.findById(followId);
      if (!follow) {
         throw new NotFoundException(USER_ERROR_CODES.FOLLOW_NOT_FOUND, {
            params: { followId },
         });
      }

      if (follow.status === FollowStatus.ACCEPTED) {
         throw new BadRequestException(USER_ERROR_CODES.ALREADY_FOLLOWING, {
            params: { followId },
         });
      }

      const updatedFollow = await this.followRepository.updateStatus(followId, FollowStatus.ACCEPTED);

      await this.graphFollowRepository.updateFollowStatus(follow.followerId, follow.followingId, FollowStatus.ACCEPTED);

      await this.userProfileRepository.incrementFollowingCount(follow.followerId);
      await this.userProfileRepository.incrementFollowersCount(follow.followingId);

      await this.outboxService.createOutboxEvent(follow.followId, 'Follow', 'FollowRequestAccepted', {
         followerId: follow.followerId,
         followingId: follow.followingId,
         status: FollowStatus.ACCEPTED,
      });

      return updatedFollow;
   }

   async rejectFollowRequest(followId: string): Promise<FollowEntity> {
      const follow = await this.followRepository.findById(followId);
      if (!follow) {
         throw new NotFoundException(USER_ERROR_CODES.FOLLOW_NOT_FOUND, {
            params: { followId },
         });
      }

      const updatedFollow = await this.followRepository.updateStatus(followId, FollowStatus.REJECTED);
      await this.graphFollowRepository.deleteFollow(follow.followerId, follow.followingId);

      await this.outboxService.createOutboxEvent(follow.followId, 'Follow', 'FollowRequestRejected', {
         followerId: follow.followerId,
         followingId: follow.followingId,
         status: FollowStatus.REJECTED,
      });

      return updatedFollow;
   }

   async getFollowers(userId: string, status?: FollowStatus, skip = 0, take = 20): Promise<FollowEntity[]> {
      const user = await this.getUserById(userId);

      const graphResults = await this.graphFollowRepository.getFollowers(user.id, status, skip, take);

      return graphResults.map((result) => {
         return new FollowEntity({
            followId: `${result.followerId}-${result.followingId}`,
            followerId: result.followerId,
            followingId: result.followingId,
            status: result.status,
            createdAt: result.createdAt,
            updatedAt: result.updatedAt,
            deletedAt: null,
         });
      });
   }

   async getFollowing(userId: string, status?: FollowStatus, skip = 0, take = 20): Promise<FollowEntity[]> {
      const user = await this.getUserById(userId);

      const graphResults = await this.graphFollowRepository.getFollowing(user.id, status, skip, take);

      return graphResults.map((result) => {
         return new FollowEntity({
            followId: `${result.followerId}-${result.followingId}`,
            followerId: result.followerId,
            followingId: result.followingId,
            status: result.status,
            createdAt: result.createdAt,
            updatedAt: result.updatedAt,
            deletedAt: null,
         });
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

   async getMutualFollowers(userId1: string, userId2: string): Promise<string[]> {
      const user1 = await this.getUserById(userId1);
      const user2 = await this.getUserById(userId2);
      return this.graphFollowRepository.getMutualFollowers(user1.id, user2.id);
   }

   async getFollowSuggestions(userId: string, limit = 10): Promise<UserSuggestionItemDto[]> {
      const user = await this.getUserById(userId);

      const followingList = await this.followRepository.findFollowing(user.id, FollowStatus.ACCEPTED, 0, 1000);
      const alreadyFollowingIds = new Set(followingList.map((f) => f.followingId));
      alreadyFollowingIds.add(user.id);

      let graphCandidateIds: string[] = [];
      try {
         const rawGraphIds = await this.graphFollowRepository.getFollowSuggestions(user.id, limit * 2);
         graphCandidateIds = rawGraphIds.filter((id) => !alreadyFollowingIds.has(id));
      } catch (err) {
         this.logger.warn(`Failed to retrieve graph follow suggestions for ${user.id}: ${String(err)}`);
      }

      const selectedGraphIds = Array.from(new Set(graphCandidateIds)).slice(0, limit);
      const graphIdSet = new Set(selectedGraphIds);

      let popularUsers: UserEntity[] = [];
      const neededCount = limit - selectedGraphIds.length;
      if (neededCount > 0) {
         const excludeIds = Array.from(new Set([...alreadyFollowingIds, ...selectedGraphIds]));
         popularUsers = await this.userProfileRepository.findTopUsers(neededCount, excludeIds);
      }

      const graphUserEntities =
         selectedGraphIds.length > 0 ? await this.userProfileRepository.findByIds(selectedGraphIds) : [];

      const allCandidateEntities = [...graphUserEntities, ...popularUsers];
      if (allCandidateEntities.length === 0) {
         return [];
      }

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
}
