import { Inject, Injectable } from '@nestjs/common';
import type { PermissionEntity, RoleEntity } from '@auth/entities/account.entity';
import { PrismaService, type PrismaClientOrTransaction } from '@auth/prisma';
import type { IRbacRepository } from '@auth/repositories/rbac.repository.interface';
import type { Permission, Role } from '@auth/prisma-client';

type RoleWithPermissions = Role & {
   rolePermissions?: Array<{
      permission: Permission;
   }>;
};

@Injectable()
export class RbacRepository implements IRbacRepository {
   constructor(@Inject(PrismaService) private readonly prisma: PrismaClientOrTransaction) {}

   private toRoleEntity(role: RoleWithPermissions): RoleEntity {
      return {
         id: role.roleId,
         code: role.code,
         name: role.name,
         description: role.description,
         version: role.version,
         deletedAt: role.deletedAt ? role.deletedAt.toISOString() : null,
         permissions: role.rolePermissions
            ? role.rolePermissions
                 .filter((rp) => rp.permission && !rp.permission.deletedAt)
                 .map((rp) => rp.permission.code)
            : [],
         createdAt: role.createdAt.toISOString(),
         updatedAt: role.updatedAt.toISOString(),
      };
   }

   async findRoleByCode(code: string): Promise<RoleEntity | null> {
      const role = await this.prisma.role.findFirst({
         where: {
            code,
            deletedAt: null,
         },
         include: {
            rolePermissions: {
               include: {
                  permission: true,
               },
            },
         },
      });

      return role ? this.toRoleEntity(role) : null;
   }

   async findRoleById(roleId: string): Promise<RoleEntity | null> {
      const role = await this.prisma.role.findFirst({
         where: {
            roleId,
            deletedAt: null,
         },
         include: {
            rolePermissions: {
               include: {
                  permission: true,
               },
            },
         },
      });

      return role ? this.toRoleEntity(role) : null;
   }

   async findPermissionsByRoleId(roleId: string): Promise<PermissionEntity[]> {
      const rolePermissions = await this.prisma.rolePermission.findMany({
         where: {
            roleId,
         },
         include: {
            permission: true,
         },
      });

      return rolePermissions
         .filter((rp) => rp.permission && !rp.permission.deletedAt)
         .map((rp) => ({
            id: rp.permission.permissionId,
            code: rp.permission.code,
            name: rp.permission.name,
            description: rp.permission.description,
            version: rp.permission.version,
            deletedAt: rp.permission.deletedAt ? rp.permission.deletedAt.toISOString() : null,
            createdAt: rp.permission.createdAt.toISOString(),
            updatedAt: rp.permission.updatedAt.toISOString(),
         }));
   }

   async assignRoleToAccount(accountId: string, roleId: string): Promise<void> {
      await this.prisma.accountRole.upsert({
         where: {
            accountId_roleId: {
               accountId,
               roleId,
            },
         },
         update: {},
         create: {
            accountId,
            roleId,
         },
      });
   }

   async removeRoleFromAccount(accountId: string, roleId: string): Promise<void> {
      await this.prisma.accountRole.deleteMany({
         where: {
            accountId,
            roleId,
         },
      });
   }

   async getAccountRoles(accountId: string): Promise<RoleEntity[]> {
      const accountRoles = await this.prisma.accountRole.findMany({
         where: {
            accountId,
         },
         include: {
            role: {
               include: {
                  rolePermissions: {
                     include: {
                        permission: true,
                     },
                  },
               },
            },
         },
      });

      return accountRoles.filter((ar) => ar.role && !ar.role.deletedAt).map((ar) => this.toRoleEntity(ar.role));
   }
}
