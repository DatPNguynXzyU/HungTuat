import { Global, Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { AppLogger } from '@common';
import { CommerceConfigModule, CommerceConfigService } from '@commerce/config';

interface RabbitMQContext {
   queue?: string;
   pattern?: string;
   correlationId?: string;
   userId?: string;
   action?: string;
}

interface ExtendedError extends Error {
   type?: string;
   code?: string | number;
   statusCode?: number;
   status?: number;
   params?: Record<string, unknown>;
}

@Global()
@Module({
   imports: [
      CommerceConfigModule,
      PinoLoggerModule.forRootAsync({
         imports: [CommerceConfigModule],
         inject: [CommerceConfigService],
         useFactory: (config: CommerceConfigService) => {
            const isProduction = config.isProduction;
            const isDevelopment = !isProduction;
            const serviceName = config.serviceName;

            let logFilePath: string | undefined;
            if (isDevelopment) {
               const logsDir = join(process.cwd(), 'apps/commerce/logs');
               logFilePath = join(logsDir, 'commerce.log');

               if (!existsSync(logsDir)) {
                  mkdirSync(logsDir, { recursive: true });
               }

               if (existsSync(logFilePath)) {
                  writeFileSync(logFilePath, '');
               }
            }

            return {
               pinoHttp: {
                  level: isProduction ? 'info' : 'debug',
                  base: {
                     service: serviceName,
                  },
                  genReqId: () => randomUUID(),
                  customProps: (req: unknown) => {
                     const context = req as RabbitMQContext;
                     const correlationId = context?.correlationId || randomUUID();
                     const userId = context?.userId;
                     const action = context?.action;
                     const pattern = context?.pattern;

                     return {
                        correlationId,
                        ...(userId ? { userId } : {}),
                        ...(action ? { action } : {}),
                        ...(pattern ? { pattern } : {}),
                     };
                  },
                  customAttributeKeys: {
                     req: 'context',
                     res: 'result',
                     err: 'error',
                     responseTime: 'durationMs',
                  },
                  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
                  serializers: {
                     context(rawContext: unknown) {
                        const ctx = rawContext as RabbitMQContext;
                        return {
                           pattern: ctx?.pattern,
                           queue: ctx?.queue,
                           correlationId: ctx?.correlationId,
                           ...(ctx?.userId ? { userId: ctx.userId } : {}),
                           ...(ctx?.action ? { action: ctx.action } : {}),
                        };
                     },
                     result(rawResult: unknown) {
                        if (rawResult && typeof rawResult === 'object') {
                           return {
                              success: true,
                              type: (rawResult as Record<string, unknown>).constructor?.name || 'Object',
                           };
                        }
                        return rawResult;
                     },
                     error(rawErr: unknown) {
                        const err = rawErr as ExtendedError;
                        return {
                           type: err.type || err.name || 'Error',
                           message: err.message,
                           stack: err.stack,
                           code: err.code,
                           statusCode: err.statusCode || err.status,
                           params: err.params,
                        };
                     },
                  },
               },
            };
         },
      }),
   ],
   providers: [AppLogger],
   exports: [PinoLoggerModule, AppLogger],
})
export class CommerceLoggerModule {}
