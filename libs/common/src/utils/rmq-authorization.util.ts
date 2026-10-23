import { UnauthorizedException, ForbiddenException } from '@common/exceptions/http.exceptions';
import { COMMON_ERROR_CODES } from '@common/exceptions/error-codes';
import { DEFAULT_ADMIN_ROLES, DEFAULT_ROLES, type RoleCode } from '@common/constants/roles.constant';
import type { PermissionCode } from '@common/constants/permissions.constant';
import { extractGrpcUser, type IAuthUserContext } from '@common/interceptors/grpc-interceptor.util';

/**
 * Resolves user context from ServiceMessage, gRPC Metadata, ArgumentsHost, or IAuthUserContext.
 */
function resolveUserContext(source: unknown): IAuthUserContext | undefined {
   if (!source) {
      return extractGrpcUser();
   }
   if (typeof source === 'object' && source !== null && 'user' in source) {
      const msgUser = (source as { user?: unknown }).user;
      if (msgUser && typeof msgUser === 'object') {
         return extractGrpcUser(msgUser);
      }
      return undefined;
   }
   return extractGrpcUser(source);
}

/**
 * Check if user has required roles (supports RMQ IServiceMessage, gRPC Metadata, ArgumentsHost, or IAuthUserContext)
 * @param contextOrMessage - ServiceMessage, gRPC Metadata, or UserContext containing roles
 * @param requiredRoles - Array of required roles
 * @throws UnauthorizedException if user context is missing
 * @throws ForbiddenException if user doesn't have required roles
 */
export const checkRoles = (contextOrMessage: unknown, requiredRoles: readonly RoleCode[]): void => {
   const user = resolveUserContext(contextOrMessage);
   if (!user || !user.roles) {
      throw new UnauthorizedException(COMMON_ERROR_CODES.MISSING_USER_CONTEXT);
   }

   if (user.roles.includes(DEFAULT_ROLES.SUPER_ADMIN)) {
      return;
   }

   const hasRole = requiredRoles.some((role) => user.roles.includes(role));

   if (!hasRole) {
      throw new ForbiddenException(COMMON_ERROR_CODES.INSUFFICIENT_ROLES, {
         params: { requiredRoles: requiredRoles.join(', ') },
      });
   }
};

/**
 * Check if user has required permissions (supports RMQ IServiceMessage, gRPC Metadata, ArgumentsHost, or IAuthUserContext)
 * @param contextOrMessage - ServiceMessage, gRPC Metadata, or UserContext containing permissions
 * @param requiredPermissions - Array of required permissions
 * @throws UnauthorizedException if user context is missing
 * @throws ForbiddenException if user doesn't have required permissions
 */
export const checkPermissions = (contextOrMessage: unknown, requiredPermissions: readonly PermissionCode[]): void => {
   const user = resolveUserContext(contextOrMessage);
   if (!user || !user.permissions) {
      throw new UnauthorizedException(COMMON_ERROR_CODES.MISSING_USER_CONTEXT);
   }

   if (user.roles?.includes(DEFAULT_ROLES.SUPER_ADMIN)) {
      return;
   }

   const hasPermission = requiredPermissions.every((permission) => user.permissions.includes(permission));

   if (!hasPermission) {
      throw new ForbiddenException(COMMON_ERROR_CODES.INSUFFICIENT_PERMISSIONS, {
         params: { requiredPermissions: requiredPermissions.join(', ') },
      });
   }
};

/**
 * Check if user is the owner of the resource
 * @param contextOrMessage - ServiceMessage, gRPC Metadata, or UserContext
 * @param resourceOwnerId - ID of the resource owner
 * @throws UnauthorizedException if user context is missing
 * @throws ForbiddenException if user is not the owner
 */
export const checkOwnership = (contextOrMessage: unknown, resourceOwnerId: string): void => {
   const user = resolveUserContext(contextOrMessage);
   if (!user) {
      throw new UnauthorizedException(COMMON_ERROR_CODES.MISSING_USER_CONTEXT);
   }

   if (user.userId !== resourceOwnerId) {
      throw new ForbiddenException(COMMON_ERROR_CODES.NOT_RESOURCE_OWNER);
   }
};

/**
 * Check if the caller possesses administrative privileges.
 * @param contextOrMessage - ServiceMessage, gRPC Metadata, or UserContext
 * @param adminRoles - Admin role or list of roles from DEFAULT_ADMIN_ROLES
 */
export const isActorAdmin = (
   contextOrMessage: unknown,
   adminRoles: RoleCode | readonly RoleCode[] = DEFAULT_ADMIN_ROLES,
): boolean => {
   const user = resolveUserContext(contextOrMessage);
   if (!user || !user.roles || user.roles.length === 0) {
      return false;
   }
   const rolesToCheck: readonly RoleCode[] = Array.isArray(adminRoles) ? adminRoles : [adminRoles];
   return rolesToCheck.some((role) => user.roles.includes(role));
};

/**
 * Check if user is the owner of the resource or an admin.
 * @param contextOrMessage - ServiceMessage, gRPC Metadata, or UserContext
 * @param resourceOwnerId - ID of the resource owner
 * @param adminRoles - Admin role or list of roles from DEFAULT_ADMIN_ROLES
 * @throws UnauthorizedException if user context is missing
 * @throws ForbiddenException if user is not the owner and not admin
 */
export const checkOwnershipOrAdmin = (
   contextOrMessage: unknown,
   resourceOwnerId: string,
   adminRoles: RoleCode | readonly RoleCode[] = DEFAULT_ADMIN_ROLES,
): void => {
   const user = resolveUserContext(contextOrMessage);
   if (!user) {
      throw new UnauthorizedException(COMMON_ERROR_CODES.MISSING_USER_CONTEXT);
   }

   const isOwner = user.userId === resourceOwnerId;
   const isAdmin = isActorAdmin(user, adminRoles);

   if (!isOwner && !isAdmin) {
      throw new ForbiddenException(COMMON_ERROR_CODES.NOT_OWNER_OR_ADMIN);
   }
};
