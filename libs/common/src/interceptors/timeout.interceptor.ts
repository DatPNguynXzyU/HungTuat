import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, TimeoutError, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { COMMON_ERROR_CODES } from '@common/exceptions/error-codes';
import { TimeoutException } from '@common/exceptions/http.exceptions';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
   constructor(private readonly timeoutMs: number = 10000) {}

   intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
      return next.handle().pipe(
         timeout(this.timeoutMs),
         catchError((err: unknown) => {
            if (err instanceof TimeoutError) {
               return throwError(() => new TimeoutException(COMMON_ERROR_CODES.TIMEOUT));
            }
            return throwError(() => (err instanceof Error ? err : new Error(String(err))));
         }),
      );
   }
}
