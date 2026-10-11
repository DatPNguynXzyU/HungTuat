import { Injectable } from '@nestjs/common';
import { uuidv7 } from '@common';
import { PrismaService } from '@user/prisma';
import { UserEntity, Gender, UserStatus } from '@user/entities';

export interface CreateUserData {
   accountId: string;
   username?: string | null;
   displayName?: string | null;
   bio?: string | null;
   avatar?: string | null;
   coverImage?: string | null;
   website?: string | null;
   location?: string | null;
   dateOfBirth?: Date | null;
   gender?: Gender | null;
   isPrivate?: boolean;
   isVerified?: boolean;
   status?: UserStatus;
}

export interface UpdateUserData {
   username?: string;
   displayName?: string;
   bio?: string;
   avatar?: string;
   coverImage?: string;
   website?: string;
   location?: string;
   dateOfBirth?: Date;
   gender?: Gender;
   isPrivate?: boolean;
   isVerified?: boolean;
   status?: UserStatus;
}

const userIncludeRelations = {
   profile: true,
   stats: true,
   settings: true,
} as const;

@Injectable()
export class UserRepository {
   constructor(private readonly prisma: PrismaService) {}

   async create(data: CreateUserData): Promise<UserEntity> {
      const user = await this.prisma.user.create({
         data: {
            id: uuidv7(),
            accountId: data.accountId,
            username: data.username,
            status: data.status || UserStatus.ACTIVE,
            profile: {
               create: {
                  id: uuidv7(),
                  displayName: data.displayName,
                  bio: data.bio,
                  avatar: data.avatar,
                  coverImage: data.coverImage,
                  website: data.website,
                  location: data.location,
                  dateOfBirth: data.dateOfBirth,
                  gender: data.gender,
               },
            },
            stats: {
               create: {
                  id: uuidv7(),
               },
            },
            settings: {
               create: {
                  id: uuidv7(),
                  isPrivate: data.isPrivate ?? false,
                  isVerified: data.isVerified ?? false,
               },
            },
         },
         include: userIncludeRelations,
      });

      return new UserEntity(user);
   }

   async findById(id: string): Promise<UserEntity | null> {
      const user = await this.prisma.user.findUnique({
         where: { id },
         include: userIncludeRelations,
      });
      if (!user || user.deletedAt) {
         return null;
      }
      return new UserEntity(user);
   }

   async findByAccountId(accountId: string): Promise<UserEntity | null> {
      const user = await this.prisma.user.findUnique({
         where: { accountId },
         include: userIncludeRelations,
      });
      if (!user || user.deletedAt) {
         return null;
      }
      return new UserEntity(user);
   }

   async findDateOfBirth(idOrAccountId: string): Promise<{ userId: string; dateOfBirth: Date | null } | null> {
      const user = await this.prisma.user.findFirst({
         where: {
            OR: [{ id: idOrAccountId }, { accountId: idOrAccountId }],
            deletedAt: null,
         },
         select: {
            id: true,
            accountId: true,
            profile: {
               select: {
                  dateOfBirth: true,
               },
            },
         },
      });

      if (!user) {
         return null;
      }

      return {
         userId: user.id,
         dateOfBirth: user.profile?.dateOfBirth ?? null,
      };
   }

   async findByUsername(username: string): Promise<UserEntity | null> {
      const user = await this.prisma.user.findUnique({
         where: { username },
         include: userIncludeRelations,
      });
      if (!user || user.deletedAt) {
         return null;
      }
      return new UserEntity(user);
   }

   async findAllUsernames(): Promise<string[]> {
      const users = await this.prisma.user.findMany({
         where: {
            deletedAt: null,
            username: { not: null },
         },
         select: {
            username: true,
         },
      });
      return users.map((u) => u.username!).filter(Boolean);
   }

   async findAll(skip = 0, take = 50): Promise<UserEntity[]> {
      const users = await this.prisma.user.findMany({
         where: { deletedAt: null },
         skip,
         take,
         include: userIncludeRelations,
      });
      return users.map((user) => new UserEntity(user));
   }

   async findByIds(ids: string[]): Promise<UserEntity[]> {
      if (!ids || ids.length === 0) {
         return [];
      }
      const users = await this.prisma.user.findMany({
         where: {
            id: { in: ids },
            deletedAt: null,
            status: UserStatus.ACTIVE,
         },
         include: userIncludeRelations,
      });
      return users.map((user) => new UserEntity(user));
   }

   async findTopUsers(limit = 10, excludeUserIds: string[] = []): Promise<UserEntity[]> {
      const users = await this.prisma.user.findMany({
         where: {
            deletedAt: null,
            status: UserStatus.ACTIVE,
            ...(excludeUserIds.length > 0 && {
               id: { notIn: excludeUserIds },
            }),
         },
         take: limit,
         orderBy: [{ stats: { followersCount: 'desc' } }, { createdAt: 'desc' }],
         include: userIncludeRelations,
      });
      return users.map((user) => new UserEntity(user));
   }

   async update(id: string, data: UpdateUserData): Promise<UserEntity> {
      const {
         username,
         status,
         displayName,
         bio,
         avatar,
         coverImage,
         website,
         location,
         dateOfBirth,
         gender,
         isPrivate,
         isVerified,
      } = data;

      const profileUpdates = {
         ...(displayName !== undefined && { displayName }),
         ...(bio !== undefined && { bio }),
         ...(avatar !== undefined && { avatar }),
         ...(coverImage !== undefined && { coverImage }),
         ...(website !== undefined && { website }),
         ...(location !== undefined && { location }),
         ...(dateOfBirth !== undefined && { dateOfBirth }),
         ...(gender !== undefined && { gender }),
      };

      const settingsUpdates = {
         ...(isPrivate !== undefined && { isPrivate }),
         ...(isVerified !== undefined && { isVerified }),
      };

      const user = await this.prisma.user.update({
         where: { id },
         data: {
            ...(username !== undefined && { username }),
            ...(status !== undefined && { status }),
            ...(Object.keys(profileUpdates).length > 0 && {
               profile: {
                  upsert: {
                     create: profileUpdates,
                     update: profileUpdates,
                  },
               },
            }),
            ...(Object.keys(settingsUpdates).length > 0 && {
               settings: {
                  upsert: {
                     create: settingsUpdates,
                     update: settingsUpdates,
                  },
               },
            }),
         },
         include: userIncludeRelations,
      });

      return new UserEntity(user);
   }

   async softDelete(id: string): Promise<UserEntity> {
      const user = await this.prisma.user.update({
         where: { id },
         data: { deletedAt: new Date() },
         include: userIncludeRelations,
      });
      return new UserEntity(user);
   }

   async restore(id: string): Promise<UserEntity> {
      const user = await this.prisma.user.update({
         where: { id },
         data: { deletedAt: null },
         include: userIncludeRelations,
      });
      return new UserEntity(user);
   }

   async incrementFollowersCount(id: string): Promise<void> {
      await this.prisma.userStats.upsert({
         where: { userId: id },
         update: { followersCount: { increment: 1 } },
         create: { userId: id, followersCount: 1 },
      });
   }

   async decrementFollowersCount(id: string): Promise<void> {
      await this.prisma.userStats.upsert({
         where: { userId: id },
         update: { followersCount: { decrement: 1 } },
         create: { userId: id, followersCount: 0 },
      });
   }

   async incrementFollowingCount(id: string): Promise<void> {
      await this.prisma.userStats.upsert({
         where: { userId: id },
         update: { followingCount: { increment: 1 } },
         create: { userId: id, followingCount: 1 },
      });
   }

   async decrementFollowingCount(id: string): Promise<void> {
      await this.prisma.userStats.upsert({
         where: { userId: id },
         update: { followingCount: { decrement: 1 } },
         create: { userId: id, followingCount: 0 },
      });
   }
}
