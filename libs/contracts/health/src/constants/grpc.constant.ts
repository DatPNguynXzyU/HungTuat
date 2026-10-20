import * as fs from 'fs';
import * as path from 'path';

export const HEALTH_GRPC_DOMAIN = 'grpc.health';

export const PROTO_VERSIONS = {
   V1: 'v1',
   V2: 'v2',
} as const;

export type ProtoVersion = (typeof PROTO_VERSIONS)[keyof typeof PROTO_VERSIONS];
export const DEFAULT_PROTO_VERSION: ProtoVersion = PROTO_VERSIONS.V1;

/**
 * Builds standard gRPC package name: <domain>.<version> (e.g. grpc.health.v1)
 */
export function buildGrpcPackageName(domain: string, version: ProtoVersion): string {
   return `${domain}.${version}`;
}

// Version 1 Constants (Active)
export const HEALTH_V1_GRPC_PACKAGE_NAME = buildGrpcPackageName(HEALTH_GRPC_DOMAIN, PROTO_VERSIONS.V1);
export const HEALTH_V1_GRPC_SERVICE_NAME = 'Health';
export const HEALTH_V1_FULL_SERVICE_NAME = `${HEALTH_V1_GRPC_PACKAGE_NAME}.${HEALTH_V1_GRPC_SERVICE_NAME}`;
export const HEALTH_V1_GRPC_CLIENT = 'HEALTH_V1_GRPC_CLIENT';

// Default / Active Aliases
export const HEALTH_GRPC_PACKAGE_NAME = HEALTH_V1_GRPC_PACKAGE_NAME;
export const HEALTH_GRPC_SERVICE_NAME = HEALTH_V1_GRPC_SERVICE_NAME;
export const HEALTH_GRPC_CLIENT = 'HEALTH_GRPC_CLIENT';

export const HEALTH_GRPC_METHODS = {
   CHECK: 'Check',
   WATCH: 'Watch',
} as const;

export const HEALTH_V1_GRPC_METHODS = HEALTH_GRPC_METHODS;

export type HealthGrpcMethod = (typeof HEALTH_GRPC_METHODS)[keyof typeof HEALTH_GRPC_METHODS];

/**
 * Standard gRPC Health Serving Status enum matching grpc.health.v1.HealthCheckResponse.ServingStatus
 */
export enum ServingStatus {
   UNKNOWN = 0,
   SERVING = 1,
   NOT_SERVING = 2,
   SERVICE_UNKNOWN = 3,
}

/**
 * Returns the resolved file path to health.proto for the specified version (defaults to v1),
 * supporting both runtime dist and source locations.
 */
export function getHealthProtoPath(version: ProtoVersion = DEFAULT_PROTO_VERSION): string {
   const filename = 'health.proto';
   const candidates = [
      path.resolve(__dirname, `../proto/${version}/${filename}`),
      path.resolve(__dirname, `../../proto/${version}/${filename}`),
      path.resolve(process.cwd(), `libs/contracts/health/src/proto/${version}/${filename}`),
      path.resolve(process.cwd(), `dist/libs/contracts/health/proto/${version}/${filename}`),
   ];

   for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
         return candidate;
      }
   }

   return candidates[0];
}
