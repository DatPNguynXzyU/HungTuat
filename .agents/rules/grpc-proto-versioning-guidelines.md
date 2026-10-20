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

Every contracts library (`libs/contracts/<domain>`) follows this canonical structure adhering to Google Protobuf & Uber Proto style guide separation:

```text
libs/contracts/<domain>/
├── src/
│   ├── proto/
│   │   ├── v1/
│   │   │   ├── models/                 <-- Shared domain entities (device.proto, user.proto, token.proto)
│   │   │   │   ├── device.proto
│   │   │   │   ├── user.proto
│   │   │   │   └── token.proto
│   │   │   ├── messages/               <-- RPC request & response transport messages importing models
│   │   │   │   └── <domain>_messages.proto
│   │   │   └── <domain>.proto          <-- Main service definition importing messages (Single Source of Truth)
│   │   └── v2/                         <-- Only created when v2 breaking changes actually occur!
│   │       ├── models/
│   │       ├── messages/
│   │       └── <domain>.proto
│   ├── grpc/
│   │   ├── v1/
│   │   │   └── <domain>-v1-grpc.interface.ts
│   │   ├── v2/                         <-- Created when v2 is released
│   │   │   └── <domain>-v2-grpc.interface.ts
│   │   └── <domain>-grpc.interface.ts  <-- Re-exports current version interfaces
│   ├── constants/
│   │   ├── grpc.constant.ts            <-- Dynamic package builder, path resolver & proto loader options
│   │   └── grpc.constant.spec.ts       <-- Verifies proto declaration matches constants & loader resolution
│   └── index.ts                        <-- Public contract exports
```

---

## 3. Proto File Definition Standards

### 3.1. Syntax and Package Declaration

All proto files must use `syntax = "proto3";` and explicit dot-notated packages (e.g. `package auth.v1;`).

### 3.2. Modular Decomposition (Models, Messages & Service)

To prevent merge conflicts and unmaintainable 1,000+ line contracts as gRPC endpoints scale, contracts must be cleanly separated into three modular layers:

1. **Domain Models (`proto/v1/models/*.proto`)**:
   - Encapsulate reusable domain entities (e.g. `DeviceInfoProto`, `AuthUserProto`, `AuthTokensProto`).
   - Have no RPC service or request/response dependencies.
   ```protobuf
   syntax = "proto3";
   package auth.v1;

   message DeviceInfoProto {
     string deviceType = 1;
     string deviceName = 2;
     // ...
   }
   ```

2. **RPC Messages (`proto/v1/messages/*_messages.proto`)**:
   - Encapsulate operation-specific request and response payloads (e.g. `CheckEmailRequest`, `LoginRequest`).
   - Import required entities from `models/`.
   ```protobuf
   syntax = "proto3";
   package auth.v1;

   import "models/device.proto";
   import "models/user.proto";
   import "models/token.proto";

   message LoginRequest {
     string email = 1;
     string password = 2;
     DeviceInfoProto deviceInfo = 7;
   }

   message LoginResponse {
     AuthUserProto user = 1;
     string accessToken = 2;
     string refreshToken = 3;
     AuthTokensProto tokens = 4;
   }
   ```

3. **Service Definition (`proto/v1/<domain>.proto`)**:
   - Thin entry point declaring ONLY the gRPC `service` and RPC methods.
   - Imports transport definitions from `messages/`.
   ```protobuf
   syntax = "proto3";
   package auth.v1;

   import "messages/auth_messages.proto";

   service AuthService {
     rpc CheckEmail (CheckEmailRequest) returns (CheckEmailResponse);
     rpc Login (LoginRequest) returns (LoginResponse);
   }
   ```

---

## 4. TypeScript Constants, Path Resolver & Loader Options Standards

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
   LOGIN: 'Login',
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
export function getAuthProtoLoaderOptions(
   version: ProtoVersion = DEFAULT_PROTO_VERSION,
) {
   return {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
      includeDirs: [getAuthProtoDir(version)],
   };
}
```

---

## 5. NestJS Microservice & Gateway Wiring

### 5.1. Microservice Server (`apps/<app>/src/main.ts`)

Connect microservice with versioned package name, path resolver, and modular loader options:

```typescript
app.connectMicroservice<MicroserviceOptions>(
   {
      transport: Transport.GRPC,
      options: {
         package: AUTH_V1_GRPC_PACKAGE_NAME, // 'auth.v1'
         protoPath: getAuthProtoPath(), // resolves to v1/auth.proto
         url: configService.grpcUrl,
         loader: getAuthProtoLoaderOptions(), // enables includeDirs resolution for modular proto imports
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
            loader: getAuthProtoLoaderOptions(),
            channelOptions: createGrpcRetryChannelOptions({
               serviceNames: [AUTH_V1_GRPC_PACKAGE_NAME],
            }),
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
