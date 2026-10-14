import type { IServiceMessage } from '@common/interfaces/service-message.interface';
import { UnauthorizedException, ForbiddenException } from '@common/exceptions/http.exceptions';
import { COMMON_ERROR_CODES } from '@common/exceptions/error-codes';

/**
 * Check if user has required roles
 * @param message - ServiceMessage containing user context
 * @param requiredRoles - Array of required roles
 * @throws UnauthorizedException if user context is missing
 * @throws ForbiddenException if user doesn't have required roles
 */
export function checkRoles(message: IServiceMessage<unknown>, requiredRoles: string[]): void {
   if (!message.user) {
      throw new UnauthorizedException(COMMON_ERROR_CODES.MISSING_USER_CONTEXT);
   }

   const hasRole = requiredRoles.some((role) => message.user?.roles.includes(role));

   if (!hasRole) {
      throw new ForbiddenException(COMMON_ERROR_CODES.INSUFFICIENT_ROLES, {
         params: { requiredRoles: requiredRoles.join(', ') },
      });
   }
}

/**
 * Check if user has required permissions
 * @param message - ServiceMessage containing user context
 * @param requiredPermissions - Array of required permissions
 * @throws UnauthorizedException if user context is missing
 * @throws ForbiddenException if user doesn't have required permissions
 */
export function checkPermissions(message: IServiceMessage<unknown>, requiredPermissions: string[]): void {
   if (!message.user) {
      throw new UnauthorizedException(COMMON_ERROR_CODES.MISSING_USER_CONTEXT);
   }

   const hasPermission = requiredPermissions.every((permission) => message.user?.permissions.includes(permission));

   if (!hasPermission) {
      throw new ForbiddenException(COMMON_ERROR_CODES.INSUFFICIENT_PERMISSIONS, {
         params: { requiredPermissions: requiredPermissions.join(', ') },
      });
   }
}

/**
 * Check if user is the owner of the resource
 * @param message - ServiceMessage containing user context
 * @param resourceOwnerId - ID of the resource owner
 * @throws UnauthorizedException if user context is missing
 * @throws ForbiddenException if user is not the owner
 */
export function checkOwnership(message: IServiceMessage<unknown>, resourceOwnerId: string): void {
   if (!message.user) {
      throw new UnauthorizedException(COMMON_ERROR_CODES.MISSING_USER_CONTEXT);
   }

   if (message.user.userId !== resourceOwnerId) {
      throw new ForbiddenException(COMMON_ERROR_CODES.NOT_RESOURCE_OWNER);
   }
}

import { DEFAULT_ROLES } from '@common/constants/roles.constant';

/**
 * Check if user is the owner OR has admin role
 * @param message - ServiceMessage containing user context
 * @param resourceOwnerId - ID of the resource owner
 * @param adminRoles - Admin role name or list of roles (default: [DEFAULT_ROLES.ADMIN, DEFAULT_ROLES.SUPER_ADMIN, 'admin'])
 * @throws UnauthorizedException if user context is missing
 * @throws ForbiddenException if user is not the owner and not admin
 */
export function checkOwnershipOrAdmin(
   message: IServiceMessage<unknown>,
   resourceOwnerId: string,
   adminRoles: string | string[] = [DEFAULT_ROLES.ADMIN, DEFAULT_ROLES.SUPER_ADMIN, 'admin'],
): void {
   if (!message.user) {
      throw new UnauthorizedException(COMMON_ERROR_CODES.MISSING_USER_CONTEXT);
   }

   const isOwner = message.user.userId === resourceOwnerId;
   const rolesToCheck = Array.isArray(adminRoles) ? adminRoles : [adminRoles];
   const userRoles = message.user.roles || [];
   const isAdmin = rolesToCheck.some((role) => userRoles.includes(role));

   if (!isOwner && !isAdmin) {
      throw new ForbiddenException(COMMON_ERROR_CODES.NOT_OWNER_OR_ADMIN);
   }
}
