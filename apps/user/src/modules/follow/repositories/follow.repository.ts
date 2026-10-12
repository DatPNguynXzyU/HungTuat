import { Injectable } from '@nestjs/common';
import { uuidv7 } from '@common';
import { PrismaService } from '@user/core/database/prisma';
import { FollowEntity, FollowStatus } from '@user/core/database/entities';
import { Prisma } from '@user/prisma-client';

export const FOLLOW_REPOSITORY = 'FOLLOW_REPOSITORY';

@Injectable()
export class FollowRepository {
   constructor(private readonly prisma: PrismaService) {}

   async create(data: Prisma.FollowCreateInput): Promise<FollowEntity> {
      const followId =
         (data as { followId?: string; id?: string }).followId || (data as { id?: string }).id || uuidv7();
      const follow = await this.prisma.follow.create({
         data: {
            ...data,
            followId,
         },
      });
      return new FollowEntity(follow);
   }

   async findById(followId: string): Promise<FollowEntity | null> {
      const follow = await this.prisma.follow.findUnique({
         where: { followId },
      });
      if (!follow || follow.deletedAt) {
         return null;
      }
      return new FollowEntity(follow);
   }

   async findByFollowerAndFollowing(followerId: string, followingId: string): Promise<FollowEntity | null> {
      const follow = await this.prisma.follow.findFirst({
         where: {
            followerId,
            followingId,
            deletedAt: null,
         },
      });
      return follow ? new FollowEntity(follow) : null;
   }

   async findAllActive(): Promise<FollowEntity[]> {
      const follows = await this.prisma.follow.findMany({
         where: {
            deletedAt: null,
         },
      });
      return follows.map((follow) => new FollowEntity(follow));
   }

   async findFollowRelations(
      currentUserId: string,
      targetUserIds: string[],
   ): Promise<{ followingSet: Set<string>; followerSet: Set<string> }> {
      const followingSet = new Set<string>();
      const followerSet = new Set<string>();

      if (!currentUserId || !targetUserIds || targetUserIds.length === 0) {
         return { followingSet, followerSet };
      }

      const follows = await this.prisma.follow.findMany({
         where: {
            deletedAt: null,
            status: FollowStatus.ACCEPTED,
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
      return follows.map((follow) => new FollowEntity(follow));
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
      return follows.map((follow) => new FollowEntity(follow));
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

   async updateStatus(followId: string, status: FollowStatus): Promise<FollowEntity> {
      const follow = await this.prisma.follow.update({
         where: { followId },
         data: { status },
      });
      return new FollowEntity(follow);
   }

   async softDelete(followId: string): Promise<FollowEntity> {
      const follow = await this.prisma.follow.update({
         where: { followId },
         data: { deletedAt: new Date() },
      });
      return new FollowEntity(follow);
   }

   async softDeleteByFollowerAndFollowing(followerId: string, followingId: string): Promise<FollowEntity | null> {
      const follow = await this.findByFollowerAndFollowing(followerId, followingId);
      if (!follow) {
         return null;
      }
      return this.softDelete(follow.followId);
   }

   async restore(followId: string): Promise<FollowEntity> {
      const follow = await this.prisma.follow.update({
         where: { followId },
         data: { deletedAt: null },
      });
      return new FollowEntity(follow);
   }
}
