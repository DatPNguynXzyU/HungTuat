---
trigger: model_decision
description: Apply when creating, updating, or documenting NestJS API controllers, Swagger OpenAPI 3.0 annotations, error responses (@ApiErrorResponse, @ApiErrorResponses), operationId, OpenAPI workflow links, or Gateway route schemas.
globs: apps/gateway/src/**/*.controller.ts,apps/gateway/src/main.ts,libs/common/src/dto/**/*.ts
---

# Swagger & OpenAPI 3.0 Documentation Guidelines

This document establishes the mandatory standards for defining, structuring, and maintaining **OpenAPI 3.0 / Swagger** documentation across the OmniServices ecosystem.

---

## 1. Core Principles

1. **100% English Standard for Swagger Metadata**:
   - All Swagger annotations (`@ApiOperation`, `@ApiResponse`, `@ApiParam`, `@ApiQuery`, `@ApiHeader`, `@ApiBody`, links `description`, summaries, and operation IDs) **MUST be written in clear, professional English**.
   - No Vietnamese or non-English text is permitted in Swagger annotations.
2. **Comprehensive Error Response Documentation**:
   - Every API endpoint that can throw client or server exceptions (400, 401, 403, 404, 409, 422, 429, 500) **MUST explicitly document all possible i18n error codes**.
   - Use `@ApiErrorResponse` or `@ApiErrorResponses` from `@common`.
3. **OpenAPI 3.0 Links for Sequential Workflows**:
   - For multi-step flows (e.g., OTP registration, password reset, profile creation), document next-step relationships using OpenAPI 3.0 `links` with standard **Runtime Expressions** (`$response.body#/data/...`, `$request.body#/...`).
4. **Explicit `operationId` Definition**:
   - Always provide a camelCase `operationId` in `@ApiOperation({ operationId: '...', summary: '...' })` for clean code generation and reliable link referencing.

---

## 2. Documenting Error Responses

### 2.1. Using `@ApiErrorResponse` and `@ApiErrorResponses`

Always import `@ApiErrorResponse` and `@ApiErrorResponses` from `@common`. The decorator automatically registers schemas and builds **OpenAPI 3.0 Multi-Example dropdowns** in Swagger UI.

```typescript
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
   ApiErrorResponses,
   ApiErrorResponse,
   AUTH_ERROR_CODES,
   COMMON_ERROR_CODES,
   ResponseMessage,
   AUTH_RESPONSE_MESSAGES,
} from '@common';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
   @Post('register/send-otp')
   @HttpCode(HttpStatus.OK)
   @ApiOperation({
      operationId: 'sendRegisterOtp',
      summary: 'Send 6-digit OTP verification code to email for registration',
   })
   @ApiResponse({
      status: 200,
      description: 'OTP code sent successfully to user email.',
      type: SendRegisterOtpResponseDto,
   })
   // Document all possible error codes and status codes
   @ApiErrorResponses([
      {
         status: HttpStatus.BAD_REQUEST,
         description: 'Email already exists, invalid email format, or OTP cooldown active',
         errorCodes: [
            AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS,
            AUTH_ERROR_CODES.INVALID_EMAIL_FORMAT,
            AUTH_ERROR_CODES.OTP_COOLDOWN_ACTIVE,
         ],
         exampleParams: { cooldownSeconds: 60 },
      },
      {
         status: HttpStatus.TOO_MANY_REQUESTS,
         description: 'Maximum daily OTP limit exceeded',
         errorCodes: [AUTH_ERROR_CODES.OTP_MAX_ATTEMPTS_EXCEEDED],
      },
   ])
   @ResponseMessage(AUTH_RESPONSE_MESSAGES.SEND_OTP_SUCCESS)
   async sendRegisterOtp(@Body() dto: SendRegisterOtpDto) {
      return this.authService.sendRegisterOtp(dto);
   }
}
```

---

## 3. OpenAPI 3.0 Links & Runtime Expressions

### 3.1. Syntax Rules for OpenAPI Links

- Use `$request.body#/field` to reference data sent in the current request.
- Use `$response.body#/data/field` to reference data returned in the current response.
- Use standard `parameters` or `requestBody` mappings.

### 3.2. Complete Multi-Step Flow Example (Registration Workflow)

#### Step 1: Send OTP

```typescript
@Post('register/send-otp')
@ApiOperation({
   operationId: 'sendRegisterOtp',
   summary: 'Send 6-digit OTP code to email',
})
@ApiResponse({
   status: 200,
   description: 'OTP code sent successfully.',
   type: SendRegisterOtpResponseDto,
   links: {
      VerifyOtp: {
         operationId: 'verifyRegisterOtp',
         description: 'Verify the 6-digit OTP code received via email in the next step',
         parameters: {
            email: '$request.body#/email',
         },
      },
   },
})
```

#### Step 2: Verify OTP

```typescript
@Post('register/verify-otp')
@ApiOperation({
   operationId: 'verifyRegisterOtp',
   summary: 'Verify OTP code and obtain verificationToken',
})
@ApiResponse({
   status: 200,
   description: 'OTP verified successfully. Returns verificationToken.',
   type: VerifyRegisterOtpResponseDto,
   links: {
      RegisterAccount: {
         operationId: 'registerAccount',
         description: 'Complete account registration using the verificationToken and email from the OTP step',
         parameters: {
            verificationToken: '$response.body#/data/verificationToken',
            email: '$response.body#/data/email',
         },
      },
   },
})
```

#### Step 3: Register Account

```typescript
@Post('register')
@ApiOperation({
   operationId: 'registerAccount',
   summary: 'Register account and obtain auth tokens',
})
@ApiResponse({
   status: 201,
   description: 'User registered successfully.',
   type: AuthResponseDto,
   links: {
      GetAuthProfile: {
         operationId: 'getAuthProfile',
         description: 'Retrieve authenticated user profile and token payload after successful registration',
      },
   },
})
```

---

## 4. Authentication & Security Decorators

1. **Public Endpoints**: Mark with `@Public()`.
2. **Authenticated Endpoints**: Always attach both `@ApiBearerAuth()` and `@ApiCookieAuth()` (unless exclusively cookie-only or token-only).
3. **Protected / RBAC Endpoints**:
   - Always document `401 Unauthorized` (`COMMON_ERROR_CODES.UNAUTHORIZED`, `AUTH_ERROR_CODES.TOKEN_INVALID_OR_EXPIRED`).
   - For role/permission-restricted endpoints, document `403 Forbidden` (`COMMON_ERROR_CODES.FORBIDDEN`, `COMMON_ERROR_CODES.INSUFFICIENT_ROLES`, `COMMON_ERROR_CODES.INSUFFICIENT_PERMISSIONS`).

---

## 5. Development Checklist for Swagger / OpenAPI

| Topic                    | Mandatory Requirement                           | Compliant Example                                                                |
| :----------------------- | :---------------------------------------------- | :------------------------------------------------------------------------------- |
| **Language**             | 100% English in all Swagger metadata            | `description: 'User profile updated successfully.'`                              |
| **Operation ID**         | Unique camelCase identifier                     | `@ApiOperation({ operationId: 'getUserById', ... })`                             |
| **Error Decorators**     | Use `@ApiErrorResponse` or `@ApiErrorResponses` | `@ApiErrorResponses([{ status: 400, errorCodes: [...] }])`                       |
| **Error Codes**          | Reference constants with `as const`             | `AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS`                                          |
| **Security**             | Declare auth headers / cookies                  | `@ApiBearerAuth()`, `@ApiCookieAuth()`                                           |
| **Workflow Links**       | Connect sequential API operations               | `links: { NextStep: { operationId: '...', ... } }`                               |
| **Gateway Registration** | Register `ErrorResponseDto` in `extraModels`    | `SwaggerModule.createDocument(app, config, { extraModels: [ErrorResponseDto] })` |
