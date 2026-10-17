import { COMMON_ERROR_CODES } from '@common/exceptions/error-codes';
import { ForbiddenException, UnauthorizedException } from '@common/exceptions/http.exceptions';
import { DEFAULT_ADMIN_ROLES, DEFAULT_ROLES } from '@common/constants/roles.constant';
import { PERMISSIONS } from '@common/constants/permissions.constant';
import type { IServiceMessage } from '@common/interfaces/service-message.interface';
import {
   checkOwnership,
   checkOwnershipOrAdmin,
   checkPermissions,
   checkRoles,
   isActorAdmin,
} from '@common/utils/rmq-authorization.util';

describe('rmq-authorization.util', () => {
   describe('checkRoles', () => {
      it('should throw UnauthorizedException when user context is missing', () => {
         const message: IServiceMessage = { data: {} };
         expect(() => checkRoles(message, [DEFAULT_ROLES.ADMIN])).toThrow(UnauthorizedException);
         expect(() => checkRoles(message, [DEFAULT_ROLES.ADMIN])).toThrow(COMMON_ERROR_CODES.MISSING_USER_CONTEXT);
      });

      it('should throw ForbiddenException when user does not have required roles', () => {
         const message: IServiceMessage = {
            data: {},
            user: {
               userId: 'user-1',
               email: 'user@example.com',
               roles: [DEFAULT_ROLES.USER],
               permissions: [],
            },
         };
         expect(() => checkRoles(message, [DEFAULT_ROLES.ADMIN])).toThrow(ForbiddenException);
         expect(() => checkRoles(message, [DEFAULT_ROLES.ADMIN])).toThrow(COMMON_ERROR_CODES.INSUFFICIENT_ROLES);
      });

      it('should pass when user has one of the required roles', () => {
         const message: IServiceMessage = {
            data: {},
            user: {
               userId: 'user-1',
               email: 'admin@example.com',
               roles: [DEFAULT_ROLES.ADMIN, DEFAULT_ROLES.SUPER_ADMIN],
               permissions: [],
            },
         };
         expect(() => checkRoles(message, [DEFAULT_ROLES.ADMIN, DEFAULT_ROLES.SUPER_ADMIN])).not.toThrow();
      });
   });

   describe('checkPermissions', () => {
      it('should throw UnauthorizedException when user context is missing', () => {
         const message: IServiceMessage = { data: {} };
         expect(() => checkPermissions(message, [PERMISSIONS.AUDIT_LOGS_READ])).toThrow(UnauthorizedException);
      });

      it('should throw ForbiddenException when user lacks some required permissions', () => {
         const message: IServiceMessage = {
            data: {},
            user: {
               userId: 'user-1',
               email: 'user@example.com',
               roles: [DEFAULT_ROLES.USER],
               permissions: [PERMISSIONS.AUDIT_LOGS_READ],
            },
         };
         expect(() => checkPermissions(message, [PERMISSIONS.AUDIT_LOGS_READ, PERMISSIONS.ROLES_READ])).toThrow(
            ForbiddenException,
         );
      });

      it('should pass when user has all required permissions', () => {
         const message: IServiceMessage = {
            data: {},
            user: {
               userId: 'user-1',
               email: 'user@example.com',
               roles: [DEFAULT_ROLES.USER],
               permissions: [PERMISSIONS.AUDIT_LOGS_READ, PERMISSIONS.ROLES_READ],
            },
         };
         expect(() => checkPermissions(message, [PERMISSIONS.AUDIT_LOGS_READ, PERMISSIONS.ROLES_READ])).not.toThrow();
      });
   });

   describe('checkOwnership', () => {
      it('should throw UnauthorizedException when user context is missing', () => {
         const message: IServiceMessage = { data: {} };
         expect(() => checkOwnership(message, 'user-123')).toThrow(UnauthorizedException);
      });

      it('should throw ForbiddenException when user is not the owner', () => {
         const message: IServiceMessage = {
            data: {},
            user: {
               userId: 'user-1',
               email: 'user1@example.com',
               roles: [DEFAULT_ROLES.USER],
               permissions: [],
            },
         };
         expect(() => checkOwnership(message, 'user-2')).toThrow(ForbiddenException);
         expect(() => checkOwnership(message, 'user-2')).toThrow(COMMON_ERROR_CODES.NOT_RESOURCE_OWNER);
      });

      it('should pass when user is the owner', () => {
         const message: IServiceMessage = {
            data: {},
            user: {
               userId: 'user-1',
               email: 'user1@example.com',
               roles: [DEFAULT_ROLES.USER],
               permissions: [],
            },
         };
         expect(() => checkOwnership(message, 'user-1')).not.toThrow();
      });
   });

   describe('checkOwnershipOrAdmin', () => {
      it('should throw UnauthorizedException when user context is missing', () => {
         const message: IServiceMessage = { data: {} };
         expect(() => checkOwnershipOrAdmin(message, 'user-123')).toThrow(UnauthorizedException);
      });

      it('should pass when user is the owner (even without admin role)', () => {
         const message: IServiceMessage = {
            data: {},
            user: {
               userId: 'user-1',
               email: 'user1@example.com',
               roles: [DEFAULT_ROLES.USER],
               permissions: [],
            },
         };
         expect(() => checkOwnershipOrAdmin(message, 'user-1')).not.toThrow();
      });

      it('should pass when user is admin (even if not the owner)', () => {
         const message: IServiceMessage = {
            data: {},
            user: {
               userId: 'admin-1',
               email: 'admin@example.com',
               roles: [DEFAULT_ROLES.ADMIN],
               permissions: [],
            },
         };
         expect(() => checkOwnershipOrAdmin(message, 'user-2')).not.toThrow();
      });

      it('should throw ForbiddenException when user is neither owner nor admin', () => {
         const message: IServiceMessage = {
            data: {},
            user: {
               userId: 'user-1',
               email: 'user1@example.com',
               roles: [DEFAULT_ROLES.USER],
               permissions: [],
            },
         };
         expect(() => checkOwnershipOrAdmin(message, 'user-2')).toThrow(ForbiddenException);
         expect(() => checkOwnershipOrAdmin(message, 'user-2')).toThrow(COMMON_ERROR_CODES.NOT_OWNER_OR_ADMIN);
      });
   });

   describe('isActorAdmin', () => {
      it('should return false when user or roles are missing', () => {
         const messageWithoutUser: IServiceMessage = { data: {} };
         expect(isActorAdmin(messageWithoutUser)).toBe(false);

         const messageWithoutRoles: IServiceMessage = {
            data: {},
            user: { userId: '1', email: 'test@example.com', roles: [], permissions: [] },
         };
         expect(isActorAdmin(messageWithoutRoles)).toBe(false);
      });

      it('should return true when user has ADMIN or SUPER_ADMIN role by default', () => {
         const adminMessage: IServiceMessage = {
            data: {},
            user: { userId: '1', email: 'admin@example.com', roles: [DEFAULT_ROLES.ADMIN], permissions: [] },
         };
         expect(isActorAdmin(adminMessage)).toBe(true);

         const superAdminMessage: IServiceMessage = {
            data: {},
            user: { userId: '2', email: 'super@example.com', roles: [DEFAULT_ROLES.SUPER_ADMIN], permissions: [] },
         };
         expect(isActorAdmin(superAdminMessage)).toBe(true);
      });

      it('should return false when user has only USER role', () => {
         const userMessage: IServiceMessage = {
            data: {},
            user: { userId: '1', email: 'user@example.com', roles: [DEFAULT_ROLES.USER], permissions: [] },
         };
         expect(isActorAdmin(userMessage)).toBe(false);
      });

      it('should support checking against custom admin roles', () => {
         const moderatorMessage: IServiceMessage = {
            data: {},
            user: { userId: '1', email: 'mod@example.com', roles: [DEFAULT_ROLES.MODERATOR], permissions: [] },
         };
         expect(isActorAdmin(moderatorMessage, DEFAULT_ROLES.MODERATOR)).toBe(true);
         expect(isActorAdmin(moderatorMessage, DEFAULT_ADMIN_ROLES)).toBe(false);
      });
   });
});
