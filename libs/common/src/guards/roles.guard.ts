import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DEFAULT_ROLES, RoleCode } from '@common/constants/roles.constant';
import { AUTH_ERROR_REASONS } from '@common/constants/auth.constant';
import { ROLES_KEY } from '@common/constants/permissions.constant';
import { IS_PUBLIC_KEY } from '@common/decorators/public.decorator';
import { COMMON_ERROR_CODES } from '@common/exceptions/error-codes';
import { ForbiddenException, UnauthorizedException } from '@common/exceptions/http.exceptions';
import { AuthenticatedRequest } from '@common/guards/jwt-auth.guard';

@Injectable()
export class RolesGuard implements CanActivate {
   constructor(private readonly reflector: Reflector) {}

   canActivate(context: ExecutionContext): boolean {
      const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
         context.getHandler(),
         context.getClass(),
      ]);

      if (isPublic) {
         return true;
      }

      const requiredRoles = this.reflector.getAllAndOverride<RoleCode[]>(ROLES_KEY, [
         context.getHandler(),
         context.getClass(),
      ]);

      if (!requiredRoles || requiredRoles.length === 0) {
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

      const hasRequiredRole = requiredRoles.some((role) => userRoles.includes(role));
      if (!hasRequiredRole) {
         throw new ForbiddenException(COMMON_ERROR_CODES.FORBIDDEN, {
            params: { reason: AUTH_ERROR_REASONS.INSUFFICIENT_ROLE, required: requiredRoles },
         });
      }

      return true;
   }
}
