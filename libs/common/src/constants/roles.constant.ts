export const DEFAULT_ROLES = {
   SUPER_ADMIN: 'SUPER_ADMIN',
   ADMIN: 'ADMIN',
   MODERATOR: 'MODERATOR',
   CHEF: 'CHEF',
   USER: 'USER',
} as const;

export type DefaultRole = (typeof DEFAULT_ROLES)[keyof typeof DEFAULT_ROLES];
export type RoleCode = DefaultRole;

export const DEFAULT_ADMIN_ROLES = [DEFAULT_ROLES.ADMIN, DEFAULT_ROLES.SUPER_ADMIN] as const;
export type AdminRole = (typeof DEFAULT_ADMIN_ROLES)[number];
