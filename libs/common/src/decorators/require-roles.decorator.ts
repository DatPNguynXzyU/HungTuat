import { CustomDecorator, SetMetadata } from '@nestjs/common';
import { ROLES_KEY, RoleCode } from '@common/constants';

export const RequireRoles = (...roles: RoleCode[]): CustomDecorator<string> => SetMetadata(ROLES_KEY, roles);
