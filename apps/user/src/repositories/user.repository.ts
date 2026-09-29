import { Injectable } from '@nestjs/common';
import { PrismaService } from '@user/prisma';
import { UserEntity, Gender } from '@user/entities';
import { Prisma } from '@user/prisma-client';

@Injectable()
export class UserRepository {
   constructor(private readonly prisma: PrismaService) {}

   async create(data: Prisma.UserCreateInput): Promise<UserEntity> {
      const user = await this.prisma.user.create({ data });
      return new UserEntity(user);
   }

   async findById(id: string): Promise<UserEntity | null> {
      const user = await this.prisma.user.findUnique({
         where: { id },
      });
      if (!user || user.deletedAt) {
         return null;
      }
      return new UserEntity(user);
   }

   async findByUserId(userId: string): Promise<UserEntity | null> {
      const user = await this.prisma.user.findUnique({
         where: { userId },
      });
      if (!user || user.deletedAt) {
         return null;
      }
      return new UserEntity(user);
   }

   async findByUsername(username: string): Promise<UserEntity | null> {
      const user = await this.prisma.user.findUnique({
         where: { username },
      });
      if (!user || user.deletedAt) {
         return null;
      }
      return new UserEntity(user);
   }

   async findByEmail(email: string): Promise<UserEntity | null> {
      const user = await this.prisma.user.findUnique({
         where: { email },
      });
      if (!user || user.deletedAt) {
         return null;
      }
      return new UserEntity(user);
   }

   async findAll(): Promise<UserEntity[]> {
      const users = await this.prisma.user.findMany({
         where: { deletedAt: null },
      });
      return users.map((user) => new UserEntity(user));
   }

   async update(
      id: string,
      data: {
         email?: string;
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
      },
   ): Promise<UserEntity> {
      const user = await this.prisma.user.update({
         where: { id },
         data,
      });
      return new UserEntity(user);
   }

   async softDelete(id: string): Promise<UserEntity> {
      const user = await this.prisma.user.update({
         where: { id },
         data: { deletedAt: new Date() },
      });
      return new UserEntity(user);
   }

   async restore(id: string): Promise<UserEntity> {
      const user = await this.prisma.user.update({
         where: { id },
         data: { deletedAt: null },
      });
      return new UserEntity(user);
   }

   async incrementFollowersCount(id: string): Promise<void> {
      await this.prisma.user.update({
         where: { id },
         data: { followersCount: { increment: 1 } },
      });
   }

   async decrementFollowersCount(id: string): Promise<void> {
      await this.prisma.user.update({
         where: { id },
         data: { followersCount: { decrement: 1 } },
      });
   }

   async incrementFollowingCount(id: string): Promise<void> {
      await this.prisma.user.update({
         where: { id },
         data: { followingCount: { increment: 1 } },
      });
   }

   async decrementFollowingCount(id: string): Promise<void> {
      await this.prisma.user.update({
         where: { id },
         data: { followingCount: { decrement: 1 } },
      });
   }
}
