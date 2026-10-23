import type { PermissionEntity, RoleEntity } from '@auth/entities/account.entity';

export const RBAC_REPOSITORY = Symbol('RBAC_REPOSITORY');

export interface IRbacRepository {
   findRoleByCode(code: string): Promise<RoleEntity | null>;
   findRoleById(roleId: string): Promise<RoleEntity | null>;
   findPermissionsByRoleId(roleId: string): Promise<PermissionEntity[]>;
   assignRoleToAccount(accountId: string, roleId: string): Promise<void>;
   removeRoleFromAccount(accountId: string, roleId: string): Promise<void>;
   getAccountRoles(accountId: string): Promise<RoleEntity[]>;
   upsertPermissions(permissions: Array<{ code: string; name: string; description?: string }>): Promise<number>;
}
