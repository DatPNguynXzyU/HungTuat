import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, type PermissionCode } from '@common/constants/permissions.constant';
import { IS_PUBLIC_KEY } from '@common/decorators/public.decorator';
import { checkPermissions } from '@common/utils/rmq-authorization.util';

/**
 * Universal gRPC Guard that validates required permissions from gRPC Metadata or RPC execution context.
 */
@Injectable()
export class GrpcPermissionsGuard implements CanActivate {
   constructor(private readonly reflector: Reflector) {}

   canActivate(context: ExecutionContext): boolean {
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

      checkPermissions(context, requiredPermissions);
      return true;
   }
}
