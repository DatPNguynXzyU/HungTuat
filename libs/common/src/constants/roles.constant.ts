export const SYSTEM_ROLES = {
   USER: 'USER',
   ADMIN: 'ADMIN',
   SUPER_ADMIN: 'SUPER_ADMIN',
} as const;

export type SystemRole = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES];

export const DEFAULT_ROLES = {
   ...SYSTEM_ROLES,
} as const;

export type DefaultRole = (typeof DEFAULT_ROLES)[keyof typeof DEFAULT_ROLES];
export type RoleCode = DefaultRole | (string & {});

export const DEFAULT_ADMIN_ROLES = [SYSTEM_ROLES.ADMIN, SYSTEM_ROLES.SUPER_ADMIN] as const;
export type AdminRole = (typeof DEFAULT_ADMIN_ROLES)[number];

export const ROLES_KEY = 'roles';
