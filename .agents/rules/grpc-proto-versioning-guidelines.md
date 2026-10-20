---
trigger: model_decision
description: Apply when creating, updating, or evolving gRPC Protocol Buffer (.proto) files, gRPC contracts, package naming (auth.v1), dynamic package constants (buildGrpcPackageName), gRPC controllers (@GrpcMethod), or Microservice/Gateway gRPC client wiring
globs: libs/contracts/**/proto/**/*.proto,libs/contracts/**/constants/grpc.constant.ts,libs/contracts/**/grpc/**/*.ts,apps/**/src/adapters/grpc/**/*.ts,apps/**/src/main.ts
---

# gRPC & Proto File Versioning Strategy Guidelines

## Description

This document defines the architectural strategy, versioning lifecycle, and mandatory conventions for Protocol Buffers (`.proto`) and gRPC services across the OmniServices monorepo. It ensures that contracts remain strictly organized as a Single Source of Truth under versioned directory paths (`proto/v1/`, `proto/v2/`), guarantees zero breaking changes across microservices and API Gateway, and eliminates magic string literals through dynamic, strongly-typed constants.

---

## 1. Core Principles

1. **Explicit Directory & Package Versioning**:
   - All `.proto` files must be organized inside dedicated version subdirectories: `proto/v1/`, `proto/v2/`.
   - The Protobuf package declaration **must explicitly include the major version**: `package <domain>.<version>;` (e.g., `package auth.v1;`, `package user.v1;`).
   - Flat, unversioned package declarations like `package auth;` are prohibited for production contracts.

2. **Semantic Versioning & Evolution Rules**:
   - **Non-breaking changes (Backward Compatible)**: Adding new optional fields, new RPC methods, or new enum values stay in the **same version** (`v1`).
   - **Breaking changes**: Modifying field types, deleting or renaming existing fields, altering RPC signatures, or changing semantic behavior requires a **new major version** (`v2`).
   - When a new version (`v2`) is introduced, **`v1` remains fully active and served concurrently** until client deprecation and sunset timelines expire.

3. **No Hardcoded Magic Strings in Code & Tests**:
   - Package names, domain names, and versions must be assembled from strongly-typed constants and helper functions (e.g., `buildGrpcPackageName(DOMAIN, PROTO_VERSIONS.V1)`).
   - Tests must assert against dynamic values or contract metadata rather than hardcoded string literals.

---

## 2. Standard Directory Layout

Every contracts library (`libs/contracts/<domain>`) follows this canonical structure:

```text
libs/contracts/<domain>/
├── src/
│   ├── proto/
│   │   ├── v1/
│   │   │   └── <domain>.proto          <-- Active v1 proto definition (Single Source of Truth)
│   │   └── v2/                         <-- Only created when v2 breaking changes actually occur!
│   │       └── <domain>.proto
│   ├── grpc/
│   │   ├── v1/
│   │   │   └── <domain>-v1-grpc.interface.ts
│   │   ├── v2/                         <-- Created when v2 is released
│   │   │   └── <domain>-v2-grpc.interface.ts
│   │   └── <domain>-grpc.interface.ts  <-- Re-exports current version interfaces
│   ├── constants/
│   │   ├── grpc.constant.ts            <-- Dynamic package builder & path resolver
│   │   └── grpc.constant.spec.ts       <-- Verifies proto declaration matches constants
│   └── index.ts                        <-- Public contract exports
```

---

## 3. Proto File Definition Standards

### 3.1. Syntax and Package Declaration

All proto files must use `syntax = "proto3";` and explicit dot-notated packages:

```protobuf
syntax = "proto3";

package auth.v1;

service AuthService {
  rpc CheckEmail (CheckEmailRequest) returns (CheckEmailResponse);
}

message CheckEmailRequest {
  string email = 1;
}

message CheckEmailResponse {
  bool available = 1;
  string email = 2;
}
```

---

## 4. TypeScript Constants & Path Resolver Standards

In `libs/contracts/<domain>/src/constants/grpc.constant.ts`:

```typescript
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

// Version 1 Constants (Single Source of Truth & Default)
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
 * supporting runtime dist, local development, and fallback paths.
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
```

---

## 5. NestJS Microservice & Gateway Wiring

### 5.1. Microservice Server (`apps/<app>/src/main.ts`)

Connect microservice with versioned package name and path resolver:

```typescript
app.connectMicroservice<MicroserviceOptions>(
   {
      transport: Transport.GRPC,
      options: {
         package: AUTH_V1_GRPC_PACKAGE_NAME, // 'auth.v1'
         protoPath: getAuthProtoPath(), // resolves to v1/auth.proto
         url: configService.grpcUrl,
      },
   },
   {
      inheritAppConfig: true,
   },
);
```

### 5.2. Inbound Adapter Controller

Use `@GrpcMethod` matching the service and method definitions:

```typescript
@Controller()
@UseFilters(new GrpcExceptionFilter())
export class AuthGrpcController implements IAuthV1GrpcService {
   constructor(private readonly commandBus: CommandBus) {}

   @GrpcMethod(AUTH_V1_GRPC_SERVICE_NAME, AUTH_V1_GRPC_METHODS.CHECK_EMAIL)
   checkEmail(data: ICheckEmailRequest): Observable<ICheckEmailResponse> {
      return from(this.commandBus.execute(new CheckEmailCommand(data.email)));
   }
}
```

### 5.3. Gateway Client Registration (`apps/gateway/src/modules/<domain>/<domain>.module.ts`)

```typescript
ClientsModule.registerAsync([
   {
      name: AUTH_V1_GRPC_CLIENT,
      imports: [GatewayConfigModule],
      inject: [GatewayConfigService],
      useFactory: (configService: GatewayConfigService) => ({
         transport: Transport.GRPC,
         options: {
            package: AUTH_V1_GRPC_PACKAGE_NAME, // 'auth.v1'
            protoPath: getAuthProtoPath(), // resolves to v1/auth.proto
            url: configService.authGrpcUrl,
         },
      }),
   },
]);
```

---

## 6. How to Roll Out `v2/` When Upgrading

When breaking changes become necessary, follow this 5-step lifecycle:

1. **Step 1: Create `proto/v2/<domain>.proto`**:
   Declare `package <domain>.v2;` and define the updated services and messages.
2. **Step 2: Add `grpc/v2/` Interfaces & DTOs**:
   Create corresponding TypeScript types and interfaces for V2.
3. **Step 3: Enable Dual-Version Serving**:
   In `apps/<domain>/src/main.ts`, configure NestJS to serve both packages simultaneously:
   ```typescript
   options: {
      package: [AUTH_V1_GRPC_PACKAGE_NAME, AUTH_V2_GRPC_PACKAGE_NAME],
      protoPath: [getAuthProtoPath('v1'), getAuthProtoPath('v2')],
      url: configService.grpcUrl,
   }
   ```
4. **Step 4: Register Versioned Controllers**:
   Create `AuthV2GrpcController` decorated with `@GrpcMethod('auth.v2.AuthService', ...)` alongside the existing V1 controller.
5. **Step 5: Client Migration & Deprecation**:
   Clients migrate calls from V1 to V2. V1 is deprecated and removed only after the deprecation window concludes.
