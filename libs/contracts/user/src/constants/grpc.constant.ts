import * as fs from 'fs';
import * as path from 'path';

export const USER_GRPC_DOMAIN = 'user';

export const PROTO_VERSIONS = {
   V1: 'v1',
   V2: 'v2',
} as const;

export type ProtoVersion = (typeof PROTO_VERSIONS)[keyof typeof PROTO_VERSIONS];
export const DEFAULT_PROTO_VERSION: ProtoVersion = PROTO_VERSIONS.V1;

/**
 * Builds standard gRPC package name: <domain>.<version> (e.g. user.v1)
 */
export function buildGrpcPackageName(domain: string, version: ProtoVersion): string {
   return `${domain}.${version}`;
}

// Version 1 Constants (Active & Default)
export const USER_V1_GRPC_PACKAGE_NAME = buildGrpcPackageName(USER_GRPC_DOMAIN, PROTO_VERSIONS.V1);
export const USER_V1_GRPC_SERVICE_NAME = 'UserService';
export const USER_V1_FULL_SERVICE_NAME = `${USER_V1_GRPC_PACKAGE_NAME}.${USER_V1_GRPC_SERVICE_NAME}`;
export const USER_V1_GRPC_CLIENT = 'USER_V1_GRPC_CLIENT';

export const USER_V1_GRPC_METHODS = {
   CHECK_USERNAME: 'CheckUsername',
} as const;

export type UserV1GrpcMethod = (typeof USER_V1_GRPC_METHODS)[keyof typeof USER_V1_GRPC_METHODS];

/**
 * Returns the resolved file path to user.proto for the specified version (defaults to v1),
 * supporting both runtime dist and source locations.
 */
export function getUserProtoPath(version: ProtoVersion = DEFAULT_PROTO_VERSION): string {
   const filename = 'user.proto';
   const candidates = [
      path.resolve(__dirname, `../proto/${version}/${filename}`),
      path.resolve(__dirname, `../../proto/${version}/${filename}`),
      path.resolve(process.cwd(), `libs/contracts/user/src/proto/${version}/${filename}`),
      path.resolve(process.cwd(), `dist/libs/contracts/user/proto/${version}/${filename}`),
   ];

   for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
         return candidate;
      }
   }

   return candidates[0];
}
