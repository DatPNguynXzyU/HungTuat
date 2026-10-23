import { SYSTEM_ROLES } from '@common';

export const USER_ROLES = {
   USER: SYSTEM_ROLES.USER,
   CHEF: 'CHEF',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];
