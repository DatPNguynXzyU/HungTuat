export const DEFAULT_ROLES = {
   SUPER_ADMIN: 'SUPER_ADMIN',
   ADMIN: 'ADMIN',
   MODERATOR: 'MODERATOR',
   CHEF: 'CHEF',
   USER: 'USER',
} as const;

export type DefaultRole = (typeof DEFAULT_ROLES)[keyof typeof DEFAULT_ROLES];
export type RoleCode = DefaultRole;
