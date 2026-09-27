---
trigger: always_on
---

# API Response and Error Handling Guidelines (i18n Standards)

This document establishes the mandatory standards for handling API responses, exceptions, and internationalization (i18n) across the entire OmniServices ecosystem (including API Gateway, Microservices, and Shared Libraries).

---

## 1. Core Principles

1. **Never Hardcode Response Messages**:
   - All messages returned to clients (both success and error responses) must be **i18n translation keys** (e.g., `AUTH.LOGIN_SUCCESS`, `AUTH.EMAIL_ALREADY_EXISTS`).
   - Do not write complete English or Vietnamese sentences directly in business logic (exceptions: internal logger messages or Swagger `@ApiOperation` / `@ApiResponse` metadata).
2. **Dynamic Values via the `params` Object**:
   - When dynamic data is needed (e.g., email, username, id, field lengths), **do not use string concatenation or template literals** (e.g., `` `User ${id} not found` ``).
   - Pass dynamic values inside the `params: Record<string, unknown>` object. This allows clients to interpolate values into translated strings (e.g., `t(errorCode, params)`).
3. **Type-Safe Error Code Constants**:
   - Every domain or module must define its error codes in a dedicated constant object using TypeScript `as const` and export the corresponding union type.

---

## 2. i18n Key Naming Conventions

All translation keys must follow the uppercase naming pattern:

```text
<DOMAIN>.<OBJECT_OR_ACTION>_<RESULT_OR_REASON>
```

- **Domain/Module Prefix**: Uppercase string (e.g., `COMMON`, `AUTH`, `USER`, `ORDER`, `PAYMENT`).
- **Success Keys**:
   - `AUTH.REGISTER_SUCCESS`
   - `AUTH.LOGIN_SUCCESS`
   - `AUTH.LOGOUT_SUCCESS`
   - `AUTH.GET_PROFILE_SUCCESS`
   - `USER.UPDATE_PROFILE_SUCCESS`
- **Error Keys**:
   - `COMMON.INVALID_REQUEST`
   - `COMMON.RESOURCE_NOT_FOUND`
   - `AUTH.EMAIL_ALREADY_EXISTS`
   - `AUTH.INVALID_CREDENTIALS`
   - `AUTH.USER_NOT_FOUND`
   - `AUTH.TOKEN_INVALID_OR_EXPIRED`

---

## 3. Base Success Response and `@ResponseMessage`

### 3.1. Standard Response Structure

All successful HTTP responses are automatically wrapped by `TransformInterceptor` (`libs/common/src/interceptors/transform.interceptor.ts`):

```json
{
   "success": true,
   "statusCode": 200,
   "message": "AUTH.LOGIN_SUCCESS",
   "data": {
      "user": {
         "id": "uuid",
         "email": "user@example.com"
      }
   },
   "meta": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10,
      "hasNext": true,
      "hasPrev": false
   },
   "timestamp": "2026-09-27T02:15:00.000Z",
   "correlationId": "req-123456"
}
```

### 3.2. Controller Usage Rules

- Apply `@ResponseMessage('<DOMAIN>.<ACTION>_SUCCESS')` to the route handler.
- The controller handler must return only the **raw payload** (e.g., `{ user: ... }`, `{ items, meta }`). Do not manually wrap the response with `{ statusCode, message, data }`.

#### 3.2.1. Correct Controller Implementation (DO)

```typescript
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ResponseMessage } from '@common';
import { RegisterDto } from '@common';
import { AuthService } from '@/modules/auth/auth.service';

@Controller('auth')
export class AuthController {
   constructor(private readonly authService: AuthService) {}

   @Post('register')
   @HttpCode(HttpStatus.CREATED)
   @ResponseMessage('AUTH.REGISTER_SUCCESS')
   async register(@Body() dto: RegisterDto) {
      const result = await this.authService.register(dto);
      return {
         user: result.user,
      };
   }
}
```

#### 3.2.2. Incorrect Controller Implementation (DON'T)

```typescript
// INCORRECT: Hardcoded natural language strings
@ResponseMessage('User registered successfully')
@ResponseMessage('Dang ky tai khoan thanh cong')

// INCORRECT: Manually wrapping statusCode/message/data inside controller
async register(@Body() dto: RegisterDto) {
   const result = await this.authService.register(dto);
   return {
      statusCode: 201,
      message: 'Success',
      data: result,
   };
}
```

---

## 4. Exception and Error Handling

### 4.1. Standard Error Response Structure

All exceptions are intercepted and standardized by `AllExceptionsFilter` (`libs/common/src/filters/all-exceptions.filter.ts`):

```json
{
   "success": false,
   "statusCode": 400,
   "errorCode": "AUTH.EMAIL_ALREADY_EXISTS",
   "message": "AUTH.EMAIL_ALREADY_EXISTS",
   "error": "Bad Request",
   "params": {
      "email": "test@example.com"
   },
   "errors": [
      {
         "field": "email",
         "message": "email must be an email",
         "code": "IS_EMAIL"
      }
   ],
   "path": "/api/v1/auth/register",
   "method": "POST",
   "timestamp": "2026-09-27T02:15:00.000Z",
   "correlationId": "req-123456"
}
```

### 4.2. Defining Error Codes per Module

Each domain/module must maintain its error constants:

- Shared error codes: `libs/common/src/exceptions/error-codes.ts` (`COMMON_ERROR_CODES`)
- Domain-specific codes: `apps/<app-name>/src/constants/<domain>-error-codes.ts`

**Example:** `apps/auth/src/constants/auth-error-codes.ts`:

```typescript
export const AUTH_ERROR_CODES = {
   EMAIL_ALREADY_EXISTS: 'AUTH.EMAIL_ALREADY_EXISTS',
   INVALID_CREDENTIALS: 'AUTH.INVALID_CREDENTIALS',
   USER_NOT_FOUND: 'AUTH.USER_NOT_FOUND',
   TOKEN_INVALID_OR_EXPIRED: 'AUTH.TOKEN_INVALID_OR_EXPIRED',
   TOKEN_MISSING: 'AUTH.TOKEN_MISSING',
} as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES];
```

### 4.3. Throwing Exceptions in Services and Business Logic

Always import and throw custom HTTP exception classes from `@common`:

- `BadRequestException` (400)
- `UnauthorizedException` (401)
- `ForbiddenException` (403)
- `NotFoundException` (404)
- `ConflictException` (409)
- `ValidationException` (422)
- `TimeoutException` (408)
- `InternalServerException` (500)
- `ServiceUnavailableException` (503)

#### 4.3.1. Correct Exception Throwing (DO)

```typescript
import { BadRequestException, NotFoundException, UnauthorizedException } from '@common';
import { AUTH_ERROR_CODES } from '@auth/constants/auth-error-codes';

// Scenario without dynamic parameters:
if (!user) {
   throw new UnauthorizedException(AUTH_ERROR_CODES.INVALID_CREDENTIALS);
}

// Scenario with dynamic parameters for client interpolation:
if (existingUser) {
   throw new BadRequestException(AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS, {
      params: { email: normalizedEmail },
   });
}

// Scenario for resource not found with dynamic ID:
if (!foundUser) {
   throw new NotFoundException(AUTH_ERROR_CODES.USER_NOT_FOUND, {
      params: { id: userId },
   });
}
```

#### 4.3.2. Incorrect Exception Throwing (DON'T)

```typescript
// INCORRECT: Throwing raw arbitrary strings
throw new BadRequestException('Email already exists');

// INCORRECT: Using template literals with dynamic variables
throw new NotFoundException(`User with ID ${userId} not found`);

// INCORRECT: Importing directly from @nestjs/common without structured errorCode
import { BadRequestException } from '@nestjs/common';
```

---

## 5. Microservice (RPC / RabbitMQ) Exception Propagation

- In microservices, throwing `AppException` (or any derived class like `BadRequestException`, `NotFoundException`) triggers `AllRpcExceptionsFilter` to serialize the error into a structured payload containing `errorCode`, `params`, and `statusCode`.
- The API Gateway deserializes the RPC response error and passes it to `AllExceptionsFilter`, seamlessly maintaining status codes and `IErrorResponse` consistency for external consumers.

---

## 6. Development Checklist

| Topic                  | Mandatory Requirement                      | Compliant Example                                                                            |
| :--------------------- | :----------------------------------------- | :------------------------------------------------------------------------------------------- |
| **Response Decorator** | Use `@ResponseMessage` with key            | `@ResponseMessage('AUTH.LOGIN_SUCCESS')`                                                     |
| **Success Payload**    | Controller returns raw data                | `return { user: result.user };`                                                              |
| **Error Codes**        | Defined as constant object with `as const` | `AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS`                                                      |
| **Exception Class**    | Imported from `@common`                    | `throw new ConflictException(AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS, { params: { email } });` |
| **i18n Interpolation** | Passed via the `params` property           | `{ params: { field: 'password', min: 8 } }`                                                  |
| **Import Aliases**     | Always use `@` path aliases                | `import { ... } from '@common';` or `@auth/...`                                              |
