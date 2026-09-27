import { CustomDecorator, SetMetadata } from '@nestjs/common';
import { PERMISSIONS_KEY, PermissionCode } from '@common/constants/permissions.constant';

export const RequirePermissions = (...permissions: PermissionCode[]): CustomDecorator<string> =>
   SetMetadata(PERMISSIONS_KEY, permissions);
