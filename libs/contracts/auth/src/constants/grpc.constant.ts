import * as fs from 'fs';
import * as path from 'path';

export const AUTH_GRPC_DOMAIN = 'auth';

export const PROTO_VERSIONS = {
   V1: 'v1',
   V2: 'v2',
} as const;

export type ProtoVersion = (typeof PROTO_VERSIONS)[keyof typeof PROTO_VERSIONS];
export const DEFAULT_PROTO_VERSION: ProtoVersion = PROTO_VERSIONS.V1;

/**
 * Builds standard gRPC package name: <domain>.<version> (e.g. auth.v1)
 */
export function buildGrpcPackageName(domain: string, version: ProtoVersion): string {
   return `${domain}.${version}`;
}

// Version 1 Constants (Active & Default)
export const AUTH_V1_GRPC_PACKAGE_NAME = buildGrpcPackageName(AUTH_GRPC_DOMAIN, PROTO_VERSIONS.V1);
export const AUTH_V1_GRPC_SERVICE_NAME = 'AuthService';
export const AUTH_V1_FULL_SERVICE_NAME = `${AUTH_V1_GRPC_PACKAGE_NAME}.${AUTH_V1_GRPC_SERVICE_NAME}`;
export const AUTH_V1_GRPC_CLIENT = 'AUTH_V1_GRPC_CLIENT';

export const AUTH_V1_GRPC_METHODS = {
   CHECK_EMAIL: 'CheckEmail',
   LOGIN: 'Login',
   REFRESH_TOKEN: 'RefreshToken',
   SEND_REGISTER_OTP: 'SendRegisterOtp',
   VERIFY_REGISTER_OTP: 'VerifyRegisterOtp',
   REGISTER: 'Register',
   GET_SESSIONS: 'GetSessions',
   REVOKE_SESSION: 'RevokeSession',
   REVOKE_OTHER_SESSIONS: 'RevokeOtherSessions',
   REVOKE_TOKEN: 'RevokeToken',
   REVOKE_ALL_USER_TOKENS: 'RevokeAllUserTokens',
   LOGOUT_ALL: 'LogoutAll',
   VALIDATE_TOKEN: 'ValidateToken',
   CHANGE_PASSWORD: 'ChangePassword',
   VERIFY_CHANGE_PASSWORD_OTP: 'VerifyChangePasswordOtp',
   GET_USER_AUDIT_LOGS: 'GetUserAuditLogs',
   GET_AUDIT_LOGS: 'GetAuditLogs',
   GET_AUDIT_LOG_BY_ID: 'GetAuditLogById',
   GET_JWKS: 'GetJwks',
   GET_EMAIL: 'GetEmail',
   GET_ROLE_PERMISSIONS: 'GetRolePermissions',
   REGISTER_SERVICE_PERMISSIONS: 'RegisterServicePermissions',
} as const;

export type AuthV1GrpcMethod = (typeof AUTH_V1_GRPC_METHODS)[keyof typeof AUTH_V1_GRPC_METHODS];

/**
 * Returns the resolved file path to auth.proto for the specified version (defaults to v1),
 * supporting both runtime dist and source locations.
 */
export function getAuthProtoPath(version: ProtoVersion = DEFAULT_PROTO_VERSION): string {
   const filename = 'auth.proto';
   const candidates = [
      path.resolve(__dirname, `../proto/${version}/${filename}`),
      path.resolve(__dirname, `../../proto/${version}/${filename}`),
      path.resolve(process.cwd(), `libs/contracts/auth/src/proto/${version}/${filename}`),
      path.resolve(process.cwd(), `dist/libs/contracts/auth/proto/${version}/${filename}`),
   ];

   for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
         return candidate;
      }
   }

   return candidates[0];
}

/**
 * Proto loader options interface matching @grpc/proto-loader configuration
 */
export interface AuthProtoLoaderOptions {
   keepCase?: boolean;
   alternateCommentMode?: boolean;
   longs?: (value: unknown) => unknown;
   enums?: (value: unknown) => unknown;
   bytes?: (value: unknown) => unknown;
   defaults?: boolean;
   arrays?: boolean;
   objects?: boolean;
   oneofs?: boolean;
   json?: boolean;
   includeDirs?: string[];
}

/**
 * Returns the resolved directory path to the proto folder for the specified version (defaults to v1),
 * supporting both runtime dist and source locations for loader.includeDirs.
 */
export function getAuthProtoDir(version: ProtoVersion = DEFAULT_PROTO_VERSION): string {
   const protoPath = getAuthProtoPath(version);
   return path.dirname(protoPath);
}

/**
 * Returns standard proto loader options configured with includeDirs for modular proto resolution.
 */
export function getAuthProtoLoaderOptions(version: ProtoVersion = DEFAULT_PROTO_VERSION): AuthProtoLoaderOptions {
   return {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
      includeDirs: [getAuthProtoDir(version)],
   };
}
