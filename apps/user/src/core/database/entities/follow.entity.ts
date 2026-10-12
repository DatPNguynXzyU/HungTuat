import { Follow as PrismaFollow, FollowStatus } from '@user/prisma-client';

export class FollowEntity implements PrismaFollow {
   followId: string;
   followerId: string;
   followingId: string;
   status: FollowStatus;
   deletedAt: Date | null;
   createdAt: Date;
   updatedAt: Date;

   constructor(partial: Partial<FollowEntity>) {
      Object.assign(this, partial);
   }
}

export { FollowStatus };
