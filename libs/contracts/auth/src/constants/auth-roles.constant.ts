import { SYSTEM_ROLES } from '@common';

export const AUTH_ROLES = {
   SUPER_ADMIN: SYSTEM_ROLES.SUPER_ADMIN,
   ADMIN: SYSTEM_ROLES.ADMIN,
   STAFF: 'STAFF',
   MODERATOR: 'MODERATOR',
} as const;

export type AuthRole = (typeof AUTH_ROLES)[keyof typeof AUTH_ROLES];
