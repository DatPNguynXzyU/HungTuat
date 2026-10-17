import type { IServiceMessage } from '@common/interfaces/service-message.interface';
import { UnauthorizedException, ForbiddenException } from '@common/exceptions/http.exceptions';
import { COMMON_ERROR_CODES } from '@common/exceptions/error-codes';
import { DEFAULT_ADMIN_ROLES, type RoleCode } from '@common/constants/roles.constant';
import type { PermissionCode } from '@common/constants/permissions.constant';

/**
 * Check if user has required roles
 * @param message - ServiceMessage containing user context
 * @param requiredRoles - Array of required roles
 * @throws UnauthorizedException if user context is missing
 * @throws ForbiddenException if user doesn't have required roles
 */
export const checkRoles = (message: IServiceMessage<unknown>, requiredRoles: readonly RoleCode[]): void => {
   const userRoles = message.user?.roles;
   if (!message.user || !userRoles) {
      throw new UnauthorizedException(COMMON_ERROR_CODES.MISSING_USER_CONTEXT);
   }

   const hasRole = requiredRoles.some((role) => userRoles.includes(role));

   if (!hasRole) {
      throw new ForbiddenException(COMMON_ERROR_CODES.INSUFFICIENT_ROLES, {
         params: { requiredRoles: requiredRoles.join(', ') },
      });
   }
};

/**
 * Check if user has required permissions
 * @param message - ServiceMessage containing user context
 * @param requiredPermissions - Array of required permissions from PERMISSIONS
 * @throws UnauthorizedException if user context is missing
 * @throws ForbiddenException if user doesn't have required permissions
 */
export const checkPermissions = (
   message: IServiceMessage<unknown>,
   requiredPermissions: readonly PermissionCode[],
): void => {
   const userPermissions = message.user?.permissions;
   if (!message.user || !userPermissions) {
      throw new UnauthorizedException(COMMON_ERROR_CODES.MISSING_USER_CONTEXT);
   }

   const hasPermission = requiredPermissions.every((permission) => userPermissions.includes(permission));

   if (!hasPermission) {
      throw new ForbiddenException(COMMON_ERROR_CODES.INSUFFICIENT_PERMISSIONS, {
         params: { requiredPermissions: requiredPermissions.join(', ') },
      });
   }
};

/**
 * Check if user is the owner of the resource
 * @param message - ServiceMessage containing user context
 * @param resourceOwnerId - ID of the resource owner
 * @throws UnauthorizedException if user context is missing
 * @throws ForbiddenException if user is not the owner
 */
export const checkOwnership = (message: IServiceMessage<unknown>, resourceOwnerId: string): void => {
   if (!message.user) {
      throw new UnauthorizedException(COMMON_ERROR_CODES.MISSING_USER_CONTEXT);
   }

   if (message.user.userId !== resourceOwnerId) {
      throw new ForbiddenException(COMMON_ERROR_CODES.NOT_RESOURCE_OWNER);
   }
};

/**
 * Check if the service message caller possesses administrative privileges.
 * @param message - ServiceMessage containing user context
 * @param adminRoles - Admin role or list of roles from DEFAULT_ADMIN_ROLES
 */
export const isActorAdmin = (
   message: IServiceMessage<unknown>,
   adminRoles: RoleCode | readonly RoleCode[] = DEFAULT_ADMIN_ROLES,
): boolean => {
   const userRoles = message.user?.roles;
   if (!userRoles || userRoles.length === 0) {
      return false;
   }
   const rolesToCheck: readonly RoleCode[] = Array.isArray(adminRoles) ? adminRoles : [adminRoles];
   return rolesToCheck.some((role) => userRoles.includes(role));
};

/**
 * Check if user is the owner of the resource or an admin.
 * @param message - ServiceMessage containing user context
 * @param resourceOwnerId - ID of the resource owner
 * @param adminRoles - Admin role or list of roles from DEFAULT_ADMIN_ROLES
 * @throws UnauthorizedException if user context is missing
 * @throws ForbiddenException if user is not the owner and not admin
 */
export const checkOwnershipOrAdmin = (
   message: IServiceMessage<unknown>,
   resourceOwnerId: string,
   adminRoles: RoleCode | readonly RoleCode[] = DEFAULT_ADMIN_ROLES,
): void => {
   if (!message.user) {
      throw new UnauthorizedException(COMMON_ERROR_CODES.MISSING_USER_CONTEXT);
   }

   const isOwner = message.user.userId === resourceOwnerId;
   const isAdmin = isActorAdmin(message, adminRoles);

   if (!isOwner && !isAdmin) {
      throw new ForbiddenException(COMMON_ERROR_CODES.NOT_OWNER_OR_ADMIN);
   }
};
