import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DEFAULT_ROLES } from '@common/constants/roles.constant';
import { AUTH_ERROR_REASONS } from '@common/constants/auth.constant';
import { PERMISSIONS_KEY, PermissionCode } from '@common/constants/permissions.constant';
import { IS_PUBLIC_KEY } from '@common/decorators/public.decorator';
import { COMMON_ERROR_CODES } from '@common/exceptions/error-codes';
import { ForbiddenException, UnauthorizedException } from '@common/exceptions/http.exceptions';
import { AuthenticatedRequest } from '@common/guards/jwt-auth.guard';
import { RbacCacheService } from '@common/redis/rbac-cache.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
   constructor(
      private readonly reflector: Reflector,
      private readonly rbacCacheService: RbacCacheService,
   ) {}

   async canActivate(context: ExecutionContext): Promise<boolean> {
      const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
         context.getHandler(),
         context.getClass(),
      ]);

      if (isPublic) {
         return true;
      }

      const requiredPermissions = this.reflector.getAllAndOverride<PermissionCode[]>(PERMISSIONS_KEY, [
         context.getHandler(),
         context.getClass(),
      ]);

      if (!requiredPermissions || requiredPermissions.length === 0) {
         return true;
      }

      const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
      const user = request.user;

      if (!user) {
         throw new UnauthorizedException(COMMON_ERROR_CODES.UNAUTHORIZED, {
            params: { reason: AUTH_ERROR_REASONS.USER_NOT_AUTHENTICATED },
         });
      }

      const userRoles = user.roles || [];

      if (userRoles.includes(DEFAULT_ROLES.SUPER_ADMIN)) {
         return true;
      }

      if (userRoles.length === 0) {
         throw new ForbiddenException(COMMON_ERROR_CODES.FORBIDDEN, {
            params: { reason: AUTH_ERROR_REASONS.INSUFFICIENT_PERMISSIONS },
         });
      }

      const permissionLists = await Promise.all(
         userRoles.map((roleCode) => this.rbacCacheService.getRolePermissions(roleCode)),
      );

      const userPermissions = new Set<string>();
      for (const permissions of permissionLists) {
         if (permissions) {
            for (const perm of permissions) {
               userPermissions.add(perm);
            }
         }
      }

      const hasAllRequired = requiredPermissions.every((perm) => userPermissions.has(perm));
      if (!hasAllRequired) {
         throw new ForbiddenException(COMMON_ERROR_CODES.FORBIDDEN, {
            params: { reason: AUTH_ERROR_REASONS.INSUFFICIENT_PERMISSIONS, required: requiredPermissions },
         });
      }

      return true;
   }
}
