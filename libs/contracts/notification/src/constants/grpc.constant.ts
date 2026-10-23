import * as fs from 'fs';
import * as path from 'path';

export const NOTIFICATION_GRPC_DOMAIN = 'notification';

export const PROTO_VERSIONS = {
   V1: 'v1',
   V2: 'v2',
} as const;

export type ProtoVersion = (typeof PROTO_VERSIONS)[keyof typeof PROTO_VERSIONS];
export const DEFAULT_PROTO_VERSION: ProtoVersion = PROTO_VERSIONS.V1;

/**
 * Builds standard gRPC package name: <domain>.<version> (e.g. notification.v1)
 */
export function buildGrpcPackageName(domain: string, version: ProtoVersion): string {
   return `${domain}.${version}`;
}

// Version 1 Constants (Active & Default)
export const NOTIFICATION_V1_GRPC_PACKAGE_NAME = buildGrpcPackageName(NOTIFICATION_GRPC_DOMAIN, PROTO_VERSIONS.V1);
export const NOTIFICATION_V1_GRPC_SERVICE_NAME = 'NotificationService';
export const NOTIFICATION_V1_FULL_SERVICE_NAME = `${NOTIFICATION_V1_GRPC_PACKAGE_NAME}.${NOTIFICATION_V1_GRPC_SERVICE_NAME}`;
export const NOTIFICATION_V1_GRPC_CLIENT = 'NOTIFICATION_V1_GRPC_CLIENT';

export const NOTIFICATION_V1_GRPC_METHODS = {
   GET_USER_NOTIFICATIONS: 'GetUserNotifications',
   GET_UNREAD_COUNT: 'GetUnreadCount',
   MARK_AS_READ: 'MarkAsRead',
   MARK_ALL_AS_READ: 'MarkAllAsRead',
} as const;

export type NotificationV1GrpcMethod = (typeof NOTIFICATION_V1_GRPC_METHODS)[keyof typeof NOTIFICATION_V1_GRPC_METHODS];

/**
 * Returns the resolved file path to notification.proto for the specified version (defaults to v1),
 * supporting runtime dist, local development, and fallback paths.
 */
export function getNotificationProtoPath(version: ProtoVersion = DEFAULT_PROTO_VERSION): string {
   const filename = 'notification.proto';
   const candidates = [
      path.resolve(__dirname, `../proto/${version}/${filename}`),
      path.resolve(__dirname, `../../proto/${version}/${filename}`),
      path.resolve(process.cwd(), `libs/contracts/notification/src/proto/${version}/${filename}`),
      path.resolve(process.cwd(), `dist/libs/contracts/notification/proto/${version}/${filename}`),
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
export interface NotificationProtoLoaderOptions {
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
export function getNotificationProtoDir(version: ProtoVersion = DEFAULT_PROTO_VERSION): string {
   const protoPath = getNotificationProtoPath(version);
   return path.dirname(protoPath);
}

/**
 * Returns standard proto loader options configured with includeDirs for modular proto resolution.
 */
export function getNotificationProtoLoaderOptions(
   version: ProtoVersion = DEFAULT_PROTO_VERSION,
): NotificationProtoLoaderOptions {
   return {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
      includeDirs: [getNotificationProtoDir(version)],
   };
}
