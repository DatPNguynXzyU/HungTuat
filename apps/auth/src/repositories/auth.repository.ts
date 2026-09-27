import { Injectable } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';
import type { CreateUserData, RoleEntity, UserEntity } from '@auth/entities/user.entity';
import { PrismaService } from '@auth/prisma/prisma.service';
import type { IAuthRepository } from '@auth/repositories/auth.repository.interface';
import type { Role, User, UserStatus } from '@prisma/client';

type UserWithRoles = User & {
   userRoles?: Array<{
      role: Role;
   }>;
};

@Injectable()
export class AuthRepository implements IAuthRepository {
   constructor(private readonly prisma: PrismaService) {}

   private toEntity(user: UserWithRoles): UserEntity {
      return {
         id: user.id,
         email: user.email,
         fullName: user.fullName,
         passwordHash: user.passwordHash,
         status: user.status,
         isEmailVerified: user.isEmailVerified,
         lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
         version: user.version,
         deletedAt: user.deletedAt ? user.deletedAt.toISOString() : null,
         roles: user.userRoles ? user.userRoles.map((ur) => ur.role.code) : [],
         createdAt: user.createdAt.toISOString(),
         updatedAt: user.updatedAt.toISOString(),
      };
   }

   async findByEmail(email: string): Promise<UserEntity | null> {
      const normalizedEmail = email.toLowerCase().trim();
      const user = await this.prisma.user.findUnique({
         where: { email: normalizedEmail },
         include: {
            userRoles: {
               include: {
                  role: true,
               },
            },
         },
      });

      return user ? this.toEntity(user) : null;
   }

   async findById(id: string): Promise<UserEntity | null> {
      const user = await this.prisma.user.findUnique({
         where: { id },
         include: {
            userRoles: {
               include: {
                  role: true,
               },
            },
         },
      });

      return user ? this.toEntity(user) : null;
   }

   async createUser(data: CreateUserData): Promise<UserEntity> {
      const id = data.id || uuidv7();
      const user = await this.prisma.user.create({
         data: {
            id,
            email: data.email.toLowerCase().trim(),
            fullName: data.fullName.trim(),
            passwordHash: data.passwordHash,
            ...(data.status ? { status: data.status as UserStatus } : {}),
            ...(typeof data.isEmailVerified === 'boolean' ? { isEmailVerified: data.isEmailVerified } : {}),
            ...(data.createdAt ? { createdAt: new Date(data.createdAt) } : {}),
            ...(data.roleId
               ? {
                    userRoles: {
                       create: [
                          {
                             roleId: data.roleId,
                          },
                       ],
                    },
                 }
               : {}),
         },
         include: {
            userRoles: {
               include: {
                  role: true,
               },
            },
         },
      });

      return this.toEntity(user);
   }

   async updateUser(id: string, data: Partial<UserEntity>): Promise<UserEntity | null> {
      try {
         const user = await this.prisma.user.update({
            where: { id },
            data: {
               ...(data.email ? { email: data.email.toLowerCase().trim() } : {}),
               ...(data.fullName ? { fullName: data.fullName.trim() } : {}),
               ...(data.passwordHash ? { passwordHash: data.passwordHash } : {}),
               ...(data.status ? { status: data.status as UserStatus } : {}),
               ...(typeof data.isEmailVerified === 'boolean' ? { isEmailVerified: data.isEmailVerified } : {}),
               ...(data.lastLoginAt !== undefined
                  ? { lastLoginAt: data.lastLoginAt ? new Date(data.lastLoginAt) : null }
                  : {}),
               ...(typeof data.version === 'number' ? { version: data.version } : {}),
               ...(data.deletedAt !== undefined ? { deletedAt: data.deletedAt ? new Date(data.deletedAt) : null } : {}),
            },
            include: {
               userRoles: {
                  include: {
                     role: true,
                  },
               },
            },
         });

         return this.toEntity(user);
      } catch {
         return null;
      }
   }

   async deleteUser(id: string): Promise<boolean> {
      try {
         await this.prisma.user.delete({
            where: { id },
         });
         return true;
      } catch {
         return false;
      }
   }

   async findRoleByCode(code: string): Promise<RoleEntity | null> {
      const role = await this.prisma.role.findUnique({
         where: { code },
         include: {
            rolePermissions: {
               include: {
                  permission: true,
               },
            },
         },
      });

      if (!role) return null;

      return {
         id: role.id,
         code: role.code,
         name: role.name,
         description: role.description,
         version: role.version,
         deletedAt: role.deletedAt ? role.deletedAt.toISOString() : null,
         permissions: role.rolePermissions.map((rp) => rp.permission.code),
         createdAt: role.createdAt.toISOString(),
         updatedAt: role.updatedAt.toISOString(),
      };
   }

   async assignRoleToUser(userId: string, roleId: string): Promise<void> {
      await this.prisma.userRole.upsert({
         where: {
            userId_roleId: {
               userId,
               roleId,
            },
         },
         update: {},
         create: {
            userId,
            roleId,
         },
      });
   }
}
