import { COMMON_ERROR_CODES } from '@common/exceptions/error-codes';
import { ForbiddenException, UnauthorizedException } from '@common/exceptions/http.exceptions';
import type { IServiceMessage } from '@common/interfaces/service-message.interface';
import {
   checkOwnership,
   checkOwnershipOrAdmin,
   checkPermissions,
   checkRoles,
} from '@common/utils/rmq-authorization.util';

describe('rmq-authorization.util', () => {
   describe('checkRoles', () => {
      it('should throw UnauthorizedException when user context is missing', () => {
         const message: IServiceMessage = { data: {} };
         expect(() => checkRoles(message, ['admin'])).toThrow(UnauthorizedException);
         expect(() => checkRoles(message, ['admin'])).toThrow(COMMON_ERROR_CODES.MISSING_USER_CONTEXT);
      });

      it('should throw ForbiddenException when user does not have required roles', () => {
         const message: IServiceMessage = {
            data: {},
            user: {
               userId: 'user-1',
               email: 'user@example.com',
               roles: ['user'],
               permissions: [],
            },
         };
         expect(() => checkRoles(message, ['admin'])).toThrow(ForbiddenException);
         expect(() => checkRoles(message, ['admin'])).toThrow(COMMON_ERROR_CODES.INSUFFICIENT_ROLES);
      });

      it('should pass when user has one of the required roles', () => {
         const message: IServiceMessage = {
            data: {},
            user: {
               userId: 'user-1',
               email: 'admin@example.com',
               roles: ['admin', 'manager'],
               permissions: [],
            },
         };
         expect(() => checkRoles(message, ['admin', 'super_admin'])).not.toThrow();
      });
   });

   describe('checkPermissions', () => {
      it('should throw UnauthorizedException when user context is missing', () => {
         const message: IServiceMessage = { data: {} };
         expect(() => checkPermissions(message, ['audit_logs:read'])).toThrow(UnauthorizedException);
      });

      it('should throw ForbiddenException when user lacks some required permissions', () => {
         const message: IServiceMessage = {
            data: {},
            user: {
               userId: 'user-1',
               email: 'user@example.com',
               roles: ['user'],
               permissions: ['audit_logs:read'],
            },
         };
         expect(() => checkPermissions(message, ['audit_logs:read', 'audit_logs:write'])).toThrow(ForbiddenException);
      });

      it('should pass when user has all required permissions', () => {
         const message: IServiceMessage = {
            data: {},
            user: {
               userId: 'user-1',
               email: 'user@example.com',
               roles: ['user'],
               permissions: ['audit_logs:read', 'audit_logs:write'],
            },
         };
         expect(() => checkPermissions(message, ['audit_logs:read', 'audit_logs:write'])).not.toThrow();
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
               roles: ['user'],
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
               roles: ['user'],
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
               roles: ['user'],
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
               roles: ['admin'],
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
               roles: ['user'],
               permissions: [],
            },
         };
         expect(() => checkOwnershipOrAdmin(message, 'user-2')).toThrow(ForbiddenException);
         expect(() => checkOwnershipOrAdmin(message, 'user-2')).toThrow(COMMON_ERROR_CODES.NOT_OWNER_OR_ADMIN);
      });
   });
});
