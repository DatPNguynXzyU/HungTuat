import { COMMON_ERROR_CODES } from '@common/exceptions/error-codes';
import { ForbiddenException, UnauthorizedException } from '@common/exceptions/http.exceptions';
import { DEFAULT_ADMIN_ROLES, DEFAULT_ROLES } from '@common/constants/roles.constant';
import type { IServiceMessage } from '@common/interfaces/service-message.interface';
import {
   checkOwnership,
   checkOwnershipOrAdmin,
   checkPermissions,
   checkRoles,
   isActorAdmin,
} from '@common/utils/rmq-authorization.util';
import { createGrpcMetadata } from '@common/interceptors/grpc-interceptor.util';

const TEST_PERMISSIONS = {
   READ: 'TEST:READ',
   WRITE: 'TEST:WRITE',
   DELETE: 'TEST:DELETE',
} as const;

const TEST_ROLES = {
   USER: 'USER',
   MODERATOR: 'MODERATOR',
} as const;

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
               roles: [TEST_ROLES.USER],
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
         expect(() => checkPermissions(message, [TEST_PERMISSIONS.READ])).toThrow(UnauthorizedException);
      });

      it('should throw ForbiddenException when user lacks some required permissions', () => {
         const message: IServiceMessage = {
            data: {},
            user: {
               userId: 'user-1',
               email: 'user@example.com',
               roles: [TEST_ROLES.USER],
               permissions: [TEST_PERMISSIONS.READ],
            },
         };
         expect(() => checkPermissions(message, [TEST_PERMISSIONS.READ, TEST_PERMISSIONS.WRITE])).toThrow(
            ForbiddenException,
         );
      });

      it('should pass when user has all required permissions', () => {
         const message: IServiceMessage = {
            data: {},
            user: {
               userId: 'user-1',
               email: 'user@example.com',
               roles: [TEST_ROLES.USER],
               permissions: [TEST_PERMISSIONS.READ, TEST_PERMISSIONS.WRITE],
            },
         };
         expect(() => checkPermissions(message, [TEST_PERMISSIONS.READ, TEST_PERMISSIONS.WRITE])).not.toThrow();
      });

      it('should bypass permission check when user has SUPER_ADMIN role', () => {
         const message: IServiceMessage = {
            data: {},
            user: {
               userId: 'admin-1',
               email: 'superadmin@example.com',
               roles: [DEFAULT_ROLES.SUPER_ADMIN],
               permissions: [],
            },
         };
         expect(() => checkPermissions(message, [TEST_PERMISSIONS.DELETE])).not.toThrow();
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
               roles: [TEST_ROLES.USER],
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
               roles: [TEST_ROLES.USER],
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
               roles: [TEST_ROLES.USER],
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
               roles: [TEST_ROLES.USER],
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
            user: { userId: '1', email: 'user@example.com', roles: [TEST_ROLES.USER], permissions: [] },
         };
         expect(isActorAdmin(userMessage)).toBe(false);
      });

      it('should support checking against custom admin roles', () => {
         const moderatorMessage: IServiceMessage = {
            data: {},
            user: { userId: '1', email: 'mod@example.com', roles: [TEST_ROLES.MODERATOR], permissions: [] },
         };
         expect(isActorAdmin(moderatorMessage, TEST_ROLES.MODERATOR)).toBe(true);
         expect(isActorAdmin(moderatorMessage, DEFAULT_ADMIN_ROLES)).toBe(false);
      });
   });

   describe('gRPC Metadata and Context Authorization Support', () => {
      it('should authorize checkRoles with gRPC Metadata', () => {
         const meta = createGrpcMetadata({
            userId: 'user-grpc-1',
            roles: [DEFAULT_ROLES.ADMIN],
         });

         expect(() => checkRoles(meta, [DEFAULT_ROLES.ADMIN])).not.toThrow();
         expect(() => checkRoles(meta, [TEST_ROLES.USER])).toThrow(ForbiddenException);
      });

      it('should authorize checkPermissions with gRPC Metadata', () => {
         const meta = createGrpcMetadata({
            userId: 'user-grpc-1',
            roles: [TEST_ROLES.USER],
            permissions: [TEST_PERMISSIONS.READ],
         });

         expect(() => checkPermissions(meta, [TEST_PERMISSIONS.READ])).not.toThrow();
         expect(() => checkPermissions(meta, [TEST_PERMISSIONS.WRITE])).toThrow(ForbiddenException);
      });

      it('should authorize checkOwnership and checkOwnershipOrAdmin with gRPC Metadata', () => {
         const meta = createGrpcMetadata({
            userId: 'owner-123',
            roles: [TEST_ROLES.USER],
         });

         expect(() => checkOwnership(meta, 'owner-123')).not.toThrow();
         expect(() => checkOwnership(meta, 'someone-else')).toThrow(ForbiddenException);

         expect(() => checkOwnershipOrAdmin(meta, 'owner-123')).not.toThrow();
         expect(() => checkOwnershipOrAdmin(meta, 'someone-else')).toThrow(ForbiddenException);

         const adminMeta = createGrpcMetadata({
            userId: 'admin-1',
            roles: [DEFAULT_ROLES.ADMIN],
         });
         expect(() => checkOwnershipOrAdmin(adminMeta, 'someone-else')).not.toThrow();
      });

      it('should throw UnauthorizedException when gRPC Metadata lacks userId', () => {
         const meta = createGrpcMetadata({});

         expect(() => checkRoles(meta, [DEFAULT_ROLES.ADMIN])).toThrow(UnauthorizedException);
         expect(() => checkOwnership(meta, 'user-1')).toThrow(UnauthorizedException);
      });
   });
});
