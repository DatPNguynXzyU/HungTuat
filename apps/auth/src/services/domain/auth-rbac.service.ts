import { Inject, Injectable } from '@nestjs/common';
import { RbacCacheService } from '@common';
import { RBAC_REPOSITORY, type IRbacRepository } from '@auth/repositories';
import type { RoleEntity } from '@auth/entities';

@Injectable()
export class AuthRbacService {
   constructor(
      @Inject(RBAC_REPOSITORY)
      private readonly rbacRepository: IRbacRepository,
      private readonly rbacCacheService: RbacCacheService,
   ) {}

   async getOrCacheRole(roleCode: string): Promise<RoleEntity | null> {
      const cached = await this.rbacCacheService.getRole(roleCode);
      if (cached) {
         return cached;
      }

      const role = await this.rbacRepository.findRoleByCode(roleCode);
      if (role) {
         await this.rbacCacheService.setRole(roleCode, {
            id: role.id,
            code: role.code,
            name: role.name,
            description: role.description,
            permissions: role.permissions || [],
         });
      }

      return role;
   }

   async getRolePermissions(roleCode: string): Promise<string[]> {
      const role = await this.getOrCacheRole(roleCode);
      return role?.permissions || [];
   }

   async registerServicePermissions(
      serviceName: string,
      permissions: Array<{ code: string; name: string; description?: string }>,
   ): Promise<number> {
      return this.rbacRepository.upsertPermissions(permissions);
   }

   async assignRoleToAccount(accountId: string, roleCode: string): Promise<void> {
      let role = await this.rbacRepository.findRoleByCode(roleCode);
      if (!role) {
         role = await this.rbacRepository.createRole({
            code: roleCode,
            name: roleCode,
            description: `Domain role ${roleCode}`,
         });
      }

      await this.rbacRepository.assignRoleToAccount(accountId, role.id);
      await this.rbacCacheService.invalidateRole(roleCode);
   }
}
