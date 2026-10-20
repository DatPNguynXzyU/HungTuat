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
