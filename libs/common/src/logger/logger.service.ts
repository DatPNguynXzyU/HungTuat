import { Injectable, LoggerService, Scope } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

@Injectable({ scope: Scope.TRANSIENT })
export class AppLogger implements LoggerService {
   constructor(private readonly pinoLogger: PinoLogger) {}

   setContext(context: string) {
      this.pinoLogger.setContext(context);
   }

   log(message: unknown, context?: string) {
      if (context) {
         this.pinoLogger.setContext(context);
      }
      if (typeof message === 'string') {
         this.pinoLogger.info(message);
      } else if (typeof message === 'object' && message !== null) {
         this.pinoLogger.info(message as Record<string, unknown>);
      } else {
         this.pinoLogger.info(String(message));
      }
   }

   error(message: unknown, trace?: string, context?: string) {
      if (context) {
         this.pinoLogger.setContext(context);
      }
      if (typeof message === 'string') {
         this.pinoLogger.error({ trace }, message);
      } else if (typeof message === 'object' && message !== null) {
         this.pinoLogger.error({ ...(message as Record<string, unknown>), trace });
      } else {
         this.pinoLogger.error({ trace }, String(message));
      }
   }

   warn(message: unknown, context?: string) {
      if (context) {
         this.pinoLogger.setContext(context);
      }
      if (typeof message === 'string') {
         this.pinoLogger.warn(message);
      } else if (typeof message === 'object' && message !== null) {
         this.pinoLogger.warn(message as Record<string, unknown>);
      } else {
         this.pinoLogger.warn(String(message));
      }
   }

   debug(message: unknown, context?: string) {
      if (context) {
         this.pinoLogger.setContext(context);
      }
      if (typeof message === 'string') {
         this.pinoLogger.debug(message);
      } else if (typeof message === 'object' && message !== null) {
         this.pinoLogger.debug(message as Record<string, unknown>);
      } else {
         this.pinoLogger.debug(String(message));
      }
   }

   verbose(message: unknown, context?: string) {
      if (context) {
         this.pinoLogger.setContext(context);
      }
      if (typeof message === 'string') {
         this.pinoLogger.trace(message);
      } else if (typeof message === 'object' && message !== null) {
         this.pinoLogger.trace(message as Record<string, unknown>);
      } else {
         this.pinoLogger.trace(String(message));
      }
   }
}
