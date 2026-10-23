export type PermissionFormat = `${string}:${string}`;
export type PermissionCode = PermissionFormat | (string & {});

export const PERMISSIONS_KEY = 'permissions';

export { ROLES_KEY } from '@common/constants/roles.constant';
