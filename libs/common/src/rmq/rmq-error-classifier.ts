import { HttpStatus } from '@nestjs/common';
import { RMQ_POISON_NAME_PATTERNS, RMQ_TRANSIENT_SYSTEM_CODES } from '@common/rmq/rmq.constants';
import { RmqErrorKind } from '@common/rmq/rmq.types';

export class RmqErrorClassifier {
   static classify(error: unknown, customClassifier?: (err: unknown) => RmqErrorKind): RmqErrorKind {
      if (customClassifier) {
         const customResult = customClassifier(error);
         if (customResult) return customResult;
      }

      if (!error) {
         return RmqErrorKind.TRANSIENT;
      }

      const errObj = error as Record<string, unknown>;
      if (errObj.isPoison === true) {
         return RmqErrorKind.POISON;
      }
      if (errObj.isPoison === false) {
         return RmqErrorKind.TRANSIENT;
      }

      // Check HTTP status code
      const status =
         typeof errObj.statusCode === 'number'
            ? errObj.statusCode
            : typeof errObj.status === 'number'
              ? errObj.status
              : undefined;

      // 4xx client errors (excluding 408 Timeout and 429 Too Many Requests) are permanent/poison failures
      if (
         status !== undefined &&
         status >= Number(HttpStatus.BAD_REQUEST) &&
         status < Number(HttpStatus.INTERNAL_SERVER_ERROR) &&
         status !== Number(HttpStatus.REQUEST_TIMEOUT) &&
         status !== Number(HttpStatus.TOO_MANY_REQUESTS)
      ) {
         return RmqErrorKind.POISON;
      }

      // Check error types and class names using defined patterns
      const errorName = typeof errObj.name === 'string' ? errObj.name : '';
      if (RMQ_POISON_NAME_PATTERNS.some((pattern) => errorName.includes(pattern))) {
         return RmqErrorKind.POISON;
      }

      if (error instanceof SyntaxError) {
         return RmqErrorKind.POISON;
      }

      // Known transient connection / network errors
      const code = typeof errObj.code === 'string' ? errObj.code : '';
      if (
         RMQ_TRANSIENT_SYSTEM_CODES.includes(code as (typeof RMQ_TRANSIENT_SYSTEM_CODES)[number]) ||
         status === Number(HttpStatus.REQUEST_TIMEOUT) ||
         status === Number(HttpStatus.TOO_MANY_REQUESTS) ||
         (status !== undefined && status >= Number(HttpStatus.INTERNAL_SERVER_ERROR))
      ) {
         return RmqErrorKind.TRANSIENT;
      }

      return RmqErrorKind.TRANSIENT;
   }
}
