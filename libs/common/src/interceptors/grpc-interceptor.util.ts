import { randomUUID } from 'crypto';
import { Metadata, status as GrpcStatus } from '@grpc/grpc-js';
import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { AppException } from '@common/exceptions/app.exception';
import { CORRELATION_ID_HEADER, REQUEST_ID_HEADER, SENSITIVE_LOG_KEYS } from '@common/logger/logger.constants';
import type { IGrpcTraceContext } from '@common/interceptors/grpc-trace.storage';

const SENSITIVE_KEYS = new Set(SENSITIVE_LOG_KEYS.map((k) => k.toLowerCase()));

/**
 * Recursively sanitizes gRPC request/response payloads to prevent credentials from leaking into logs.
 */
export function sanitizeGrpcPayload(data: unknown): unknown {
   if (data === null || data === undefined || typeof data !== 'object') {
      return data;
   }

   if (Array.isArray(data)) {
      return data.map((item) => sanitizeGrpcPayload(item));
   }

   const sanitized: Record<string, unknown> = {};
   for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
         sanitized[key] = '***REDACTED***';
      } else if (typeof value === 'object' && value !== null) {
         sanitized[key] = sanitizeGrpcPayload(value);
      } else {
         sanitized[key] = value;
      }
   }
   return sanitized;
}

/**
 * Converts metadata value safely to string.
 */
function stringifyMetadataValue(value: unknown): string | undefined {
   if (typeof value === 'string') {
      return value;
   }
   if (Buffer.isBuffer(value)) {
      return value.toString('utf8');
   }
   if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
   }
   return undefined;
}

/**
 * Extracts correlationId, caller service, and metadata map from gRPC ExecutionContext or ArgumentsHost.
 */
export function extractGrpcMetadata(context: ArgumentsHost): IGrpcTraceContext {
   const rpcContext = context.switchToRpc();
   const rawMetadata = rpcContext.getContext<unknown>();
   const metadataMap: Record<string, string> = {};
   let correlationId: string | undefined;

   if (rawMetadata && typeof rawMetadata === 'object') {
      const metadataObj = rawMetadata as {
         getMap?: () => Record<string, unknown>;
         get?: (key: string) => unknown[];
         [key: string]: unknown;
      };

      if (typeof metadataObj.getMap === 'function') {
         const map = metadataObj.getMap();
         for (const [k, v] of Object.entries(map)) {
            const strVal = stringifyMetadataValue(v);
            if (strVal !== undefined) {
               metadataMap[k.toLowerCase()] = strVal;
            }
         }
      } else {
         for (const [k, v] of Object.entries(metadataObj)) {
            const strVal = stringifyMetadataValue(v);
            if (strVal !== undefined) {
               metadataMap[k.toLowerCase()] = strVal;
            }
         }
      }

      if (typeof metadataObj.get === 'function') {
         const corrVal = metadataObj.get(CORRELATION_ID_HEADER);
         if (Array.isArray(corrVal) && corrVal.length > 0) {
            correlationId = stringifyMetadataValue(corrVal[0]);
         }
         if (!correlationId) {
            const reqVal = metadataObj.get(REQUEST_ID_HEADER);
            if (Array.isArray(reqVal) && reqVal.length > 0) {
               correlationId = stringifyMetadataValue(reqVal[0]);
            }
         }
      }
   }

   if (!correlationId) {
      correlationId =
         metadataMap[CORRELATION_ID_HEADER] ||
         metadataMap[REQUEST_ID_HEADER] ||
         metadataMap['correlationid'] ||
         metadataMap['requestid'] ||
         randomUUID();
   }

   const callerService =
      metadataMap['x-caller-service'] || metadataMap['caller-service'] || metadataMap['callerservice'];
   const userId = metadataMap['x-user-id'] || metadataMap['user-id'] || metadataMap['userid'];
   const requestId = metadataMap[REQUEST_ID_HEADER] || metadataMap['requestid'];

   return {
      correlationId,
      requestId,
      userId,
      callerService,
      metadata: metadataMap,
   };
}

/**
 * Constructs a gRPC Metadata instance containing tracing and contextual headers.
 */
export function createGrpcMetadata(context?: {
   correlationId?: string;
   requestId?: string;
   userId?: string;
   callerService?: string;
   [key: string]: string | undefined;
}): Metadata {
   const metadata = new Metadata();
   const correlationId = context?.correlationId || randomUUID();
   metadata.set(CORRELATION_ID_HEADER, correlationId);

   if (context?.requestId) {
      metadata.set(REQUEST_ID_HEADER, context.requestId);
   }
   if (context?.userId) {
      metadata.set('x-user-id', context.userId);
   }
   if (context?.callerService) {
      metadata.set('x-caller-service', context.callerService);
   }

   if (context) {
      for (const [key, value] of Object.entries(context)) {
         if (value !== undefined && !['correlationId', 'requestId', 'userId', 'callerService'].includes(key)) {
            const headerKey = key.startsWith('x-') ? key.toLowerCase() : `x-${key.toLowerCase()}`;
            metadata.set(headerKey, value);
         }
      }
   }

   return metadata;
}

/**
 * Maps HTTP status codes to standard gRPC status codes.
 */
export function mapHttpStatusToGrpc(httpStatus: HttpStatus): number {
   switch (httpStatus) {
      case HttpStatus.BAD_REQUEST:
      case HttpStatus.UNPROCESSABLE_ENTITY:
         return GrpcStatus.INVALID_ARGUMENT;
      case HttpStatus.UNAUTHORIZED:
         return GrpcStatus.UNAUTHENTICATED;
      case HttpStatus.FORBIDDEN:
         return GrpcStatus.PERMISSION_DENIED;
      case HttpStatus.NOT_FOUND:
         return GrpcStatus.NOT_FOUND;
      case HttpStatus.CONFLICT:
         return GrpcStatus.ALREADY_EXISTS;
      case HttpStatus.TOO_MANY_REQUESTS:
         return GrpcStatus.RESOURCE_EXHAUSTED;
      default:
         return GrpcStatus.INTERNAL;
   }
}

/**
 * Extracts gRPC numerical code and string name from unknown thrown error.
 */
export function getGrpcStatusFromError(error: unknown): { code: number; statusName: string } {
   let code: number = GrpcStatus.INTERNAL;

   if (error instanceof AppException) {
      const payload = error.getPayload();
      code = mapHttpStatusToGrpc(payload.statusCode);
   } else if (error instanceof RpcException) {
      const err = error.getError();
      if (typeof err === 'object' && err !== null && typeof (err as { code?: number }).code === 'number') {
         code = (err as { code: number }).code;
      }
   } else if (typeof error === 'object' && error !== null && typeof (error as { code?: number }).code === 'number') {
      code = (error as { code: number }).code;
   }

   const statusName = (GrpcStatus[code] as string | undefined) || 'INTERNAL';
   return { code, statusName };
}
