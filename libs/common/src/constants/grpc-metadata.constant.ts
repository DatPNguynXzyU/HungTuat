/**
 * Standard gRPC Metadata header keys used for distributed tracing and context propagation.
 */
export const GRPC_METADATA_KEYS = {
   // User Context
   USER_ID: 'x-user-id',
   ACCOUNT_ID: 'x-account-id',
   USER_EMAIL: 'x-user-email',
   EMAIL: 'x-email',
   USER_ROLES: 'x-user-roles',
   ROLES: 'x-roles',
   USER_PERMISSIONS: 'x-user-permissions',
   PERMISSIONS: 'x-permissions',
   SESSION_ID: 'x-session-id',
   DEVICE_ID: 'x-device-id',

   // Tracing & Routing
   CORRELATION_ID: 'x-correlation-id',
   REQUEST_ID: 'x-request-id',
   CALLER_SERVICE: 'x-caller-service',
} as const;

export type GrpcMetadataKey = (typeof GRPC_METADATA_KEYS)[keyof typeof GRPC_METADATA_KEYS];

/**
 * Normalized fallback alias lists for parsing incoming gRPC metadata from various clients.
 */
export const GRPC_METADATA_ALIASES = {
   USER_ID: ['x-user-id', 'x-account-id', 'user-id', 'account-id', 'userid', 'accountid', 'sub'] as const,
   ACCOUNT_ID: ['x-account-id', 'account-id', 'accountid'] as const,
   USER_EMAIL: ['x-user-email', 'x-email', 'user-email', 'email'] as const,
   USER_ROLES: ['x-user-roles', 'x-roles', 'user-roles', 'roles'] as const,
   USER_PERMISSIONS: ['x-user-permissions', 'x-permissions', 'user-permissions', 'permissions'] as const,
   SESSION_ID: ['x-session-id', 'session-id', 'sessionid', 'jti'] as const,
   DEVICE_ID: ['x-device-id', 'device-id', 'deviceid'] as const,
   CALLER_SERVICE: ['x-caller-service', 'caller-service', 'callerservice'] as const,
   CORRELATION_ID: ['x-correlation-id', 'correlation-id', 'correlationid'] as const,
   REQUEST_ID: ['x-request-id', 'request-id', 'requestid'] as const,
} as const;

/**
 * Standard reserved option keys in GrpcMetadataOptions that are explicitly handled
 * and must not be blindly re-mapped in generic pass-through iterations.
 */
export const GRPC_CONTEXT_RESERVED_KEYS = [
   'correlationId',
   'requestId',
   'userId',
   'accountId',
   'callerService',
   'email',
   'roles',
   'permissions',
   'user',
] as const;

export type GrpcContextReservedKey = (typeof GRPC_CONTEXT_RESERVED_KEYS)[number];

export const GRPC_CONTEXT_RESERVED_KEY_SET = new Set<string>(GRPC_CONTEXT_RESERVED_KEYS);
