import { User as PrismaUser, Gender, UserStatus } from '@user/prisma-client';

export class UserEntity implements PrismaUser {
   id: string;
   userId: string;
   email: string | null;
   username: string | null;
   displayName: string | null;
   bio: string | null;
   avatar: string | null;
   coverImage: string | null;
   website: string | null;
   location: string | null;
   dateOfBirth: Date | null;
   gender: Gender | null;
   isVerified: boolean;
   isPrivate: boolean;
   status: UserStatus;
   followersCount: number;
   followingCount: number;
   postsCount: number;
   deletedAt: Date | null;
   createdAt: Date;
   updatedAt: Date;
   lastActiveAt: Date | null;

   constructor(partial: Partial<UserEntity>) {
      Object.assign(this, partial);
   }
}

export { Gender, UserStatus };
