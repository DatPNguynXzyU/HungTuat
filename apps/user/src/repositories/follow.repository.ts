import { Inject, Injectable } from '@nestjs/common';
import { BadRequestException, uuidv7 } from '@common';
import { PrismaService, type PrismaClientOrTransaction } from '@user/prisma';
import { FollowEntity, FollowStatus } from '@user/entities';
import { FollowEntityBuilder } from '@user/builders';
import { USER_ERROR_CODES } from '@contracts/user';
import { FOLLOW_FIELDS } from '@user/constants';
import {
   resolveMissingFollowTargetField,
   createMissingFieldParams,
} from '@user/chains/follow-validation/follow-validation.helper';
import type { Follow, Prisma } from '@user/prisma-client';
import type {
   CreateFollowData,
   FollowRelationsResult,
   IFollowRepository,
} from '@user/repositories/follow.repository.interface';

export * from '@user/repositories/follow.repository.interface';

@Injectable()
export class FollowRepository implements IFollowRepository {
   constructor(@Inject(PrismaService) private readonly prisma: PrismaClientOrTransaction) {}

   private toEntity(follow: Follow): FollowEntity {
      return FollowEntityBuilder.create().fromPrismaFollow(follow).build();
   }

   async create(data: CreateFollowData, tx?: Prisma.TransactionClient): Promise<FollowEntity> {
      const client = tx ?? this.prisma;
      const followId = data.followId ?? uuidv7();
      const followerId = data.followerId ?? data.follower?.connect?.userId;
      const followingId = data.followingId ?? data.following?.connect?.userId;

      const missingField = resolveMissingFollowTargetField({ followerId, followingId });
      if (missingField) {
         throw new BadRequestException(USER_ERROR_CODES.USER_ID_REQUIRED, {
            params: createMissingFieldParams(missingField, FOLLOW_FIELDS.FIELD),
         });
      }

      const follow = await client.follow.create({
         data: {
            followId,
            follower: { connect: { userId: followerId } },
            following: { connect: { userId: followingId } },
            status: data.status ?? FollowStatus.PENDING,
         },
      });
      return this.toEntity(follow);
   }

   async findById(followId: string): Promise<FollowEntity | null> {
      const follow = await this.prisma.follow.findFirst({
         where: {
            followId,
            deletedAt: null,
         },
      });
      return follow ? this.toEntity(follow) : null;
   }

   async findByFollowerAndFollowing(followerId: string, followingId: string): Promise<FollowEntity | null> {
      const follow = await this.prisma.follow.findFirst({
         where: {
            followerId,
            followingId,
            deletedAt: null,
         },
      });
      return follow ? this.toEntity(follow) : null;
   }

   async findAllActive(): Promise<FollowEntity[]> {
      const follows = await this.prisma.follow.findMany({
         where: {
            deletedAt: null,
         },
      });
      return follows.map((follow) => this.toEntity(follow));
   }

   async findFollowRelations(
      currentUserId: string,
      targetUserIds: string[],
      status: FollowStatus = FollowStatus.ACCEPTED,
   ): Promise<FollowRelationsResult> {
      const followingSet = new Set<string>();
      const followerSet = new Set<string>();

      if (!currentUserId || !targetUserIds || targetUserIds.length === 0) {
         return { followingSet, followerSet };
      }

      const follows = await this.prisma.follow.findMany({
         where: {
            deletedAt: null,
            status,
            OR: [
               {
                  followerId: currentUserId,
                  followingId: { in: targetUserIds },
               },
               {
                  followerId: { in: targetUserIds },
                  followingId: currentUserId,
               },
            ],
         },
         select: {
            followerId: true,
            followingId: true,
         },
      });

      for (const follow of follows) {
         if (follow.followerId === currentUserId) {
            followingSet.add(follow.followingId);
         }
         if (follow.followingId === currentUserId) {
            followerSet.add(follow.followerId);
         }
      }

      return { followingSet, followerSet };
   }

   async findFollowers(userId: string, status?: FollowStatus, skip = 0, take = 20): Promise<FollowEntity[]> {
      const follows = await this.prisma.follow.findMany({
         where: {
            followingId: userId,
            deletedAt: null,
            ...(status && { status }),
         },
         skip,
         take,
         orderBy: { createdAt: 'desc' },
      });
      return follows.map((follow) => this.toEntity(follow));
   }

   async findFollowing(userId: string, status?: FollowStatus, skip = 0, take = 20): Promise<FollowEntity[]> {
      const follows = await this.prisma.follow.findMany({
         where: {
            followerId: userId,
            deletedAt: null,
            ...(status && { status }),
         },
         skip,
         take,
         orderBy: { createdAt: 'desc' },
      });
      return follows.map((follow) => this.toEntity(follow));
   }

   async countFollowers(userId: string, status?: FollowStatus): Promise<number> {
      return this.prisma.follow.count({
         where: {
            followingId: userId,
            deletedAt: null,
            ...(status && { status }),
         },
      });
   }

   async countFollowing(userId: string, status?: FollowStatus): Promise<number> {
      return this.prisma.follow.count({
         where: {
            followerId: userId,
            deletedAt: null,
            ...(status && { status }),
         },
      });
   }

   async updateStatus(followId: string, status: FollowStatus, tx?: Prisma.TransactionClient): Promise<FollowEntity> {
      const client = tx ?? this.prisma;
      const follow = await client.follow.update({
         where: { followId },
         data: { status },
      });
      return this.toEntity(follow);
   }

   async softDelete(followId: string, tx?: Prisma.TransactionClient): Promise<FollowEntity> {
      const client = tx ?? this.prisma;
      const follow = await client.follow.update({
         where: { followId },
         data: { deletedAt: new Date() },
      });
      return this.toEntity(follow);
   }

   async softDeleteByFollowerAndFollowing(
      followerId: string,
      followingId: string,
      tx?: Prisma.TransactionClient,
   ): Promise<FollowEntity | null> {
      const follow = await this.findByFollowerAndFollowing(followerId, followingId);
      if (!follow) {
         return null;
      }
      return this.softDelete(follow.followId, tx);
   }

   async restore(followId: string, tx?: Prisma.TransactionClient): Promise<FollowEntity> {
      const client = tx ?? this.prisma;
      const follow = await client.follow.update({
         where: { followId },
         data: { deletedAt: null },
      });
      return this.toEntity(follow);
   }

   async delete(followId: string, tx?: Prisma.TransactionClient): Promise<FollowEntity> {
      const client = tx ?? this.prisma;
      const follow = await client.follow.delete({
         where: { followId },
      });
      return this.toEntity(follow);
   }

   async deleteByFollowerAndFollowing(
      followerId: string,
      followingId: string,
      tx?: Prisma.TransactionClient,
   ): Promise<FollowEntity | null> {
      const follow = await this.findByFollowerAndFollowing(followerId, followingId);
      if (!follow) {
         return null;
      }
      return this.delete(follow.followId, tx);
   }
}
