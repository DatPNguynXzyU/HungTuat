import type { Prisma } from '@user/prisma-client';
import type { FollowEntity, FollowStatus } from '@user/core/database/entities';

export const FOLLOW_REPOSITORY = Symbol('FOLLOW_REPOSITORY');

export interface CreateFollowData {
   followId?: string;
   followerId?: string;
   followingId?: string;
   follower?: { connect: { userId: string } };
   following?: { connect: { userId: string } };
   status?: FollowStatus;
}

export interface FollowRelationsResult {
   followingSet: Set<string>;
   followerSet: Set<string>;
}

export interface IFollowRepository {
   create(data: CreateFollowData, tx?: Prisma.TransactionClient): Promise<FollowEntity>;
   findById(followId: string): Promise<FollowEntity | null>;
   findByFollowerAndFollowing(followerId: string, followingId: string): Promise<FollowEntity | null>;
   findAllActive(): Promise<FollowEntity[]>;
   findFollowRelations(
      currentUserId: string,
      targetUserIds: string[],
      status?: FollowStatus,
   ): Promise<FollowRelationsResult>;
   findFollowers(userId: string, status?: FollowStatus, skip?: number, take?: number): Promise<FollowEntity[]>;
   findFollowing(userId: string, status?: FollowStatus, skip?: number, take?: number): Promise<FollowEntity[]>;
   countFollowers(userId: string, status?: FollowStatus): Promise<number>;
   countFollowing(userId: string, status?: FollowStatus): Promise<number>;
   updateStatus(followId: string, status: FollowStatus, tx?: Prisma.TransactionClient): Promise<FollowEntity>;
   softDelete(followId: string, tx?: Prisma.TransactionClient): Promise<FollowEntity>;
   softDeleteByFollowerAndFollowing(
      followerId: string,
      followingId: string,
      tx?: Prisma.TransactionClient,
   ): Promise<FollowEntity | null>;
   restore(followId: string, tx?: Prisma.TransactionClient): Promise<FollowEntity>;
   delete(followId: string, tx?: Prisma.TransactionClient): Promise<FollowEntity>;
   deleteByFollowerAndFollowing(
      followerId: string,
      followingId: string,
      tx?: Prisma.TransactionClient,
   ): Promise<FollowEntity | null>;
}
