import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '@common/decorators/public.decorator';
import { checkRoles } from '@common/utils/rmq-authorization.util';
import { RoleCode, ROLES_KEY } from '@common/constants';

/**
 * Universal gRPC Guard that validates user roles from gRPC Metadata or RPC execution context.
 */
@Injectable()
export class GrpcRolesGuard implements CanActivate {
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

      checkRoles(context, requiredRoles);
      return true;
   }
}
