import { Global, Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { AppLogger, DEFAULT_PINO_REDACT_OPTIONS, uuidv7 } from '@common';
import { PostConfigModule, PostConfigService } from '@post/config';

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
      PostConfigModule,
      PinoLoggerModule.forRootAsync({
         imports: [PostConfigModule],
         inject: [PostConfigService],
         useFactory: (config: PostConfigService) => {
            const nodeEnv = config.nodeEnv;
            const isProduction = config.isProduction;
            const isDevelopment = config.isDevelopment;
            const serviceName = config.serviceName;
            const logLevel = config.logLevel;

            // Clear and prepare log file for development environment
            let logFilePath: string | undefined;
            if (isDevelopment) {
               const logsDir = join(process.cwd(), 'apps/post/logs');
               logFilePath = join(logsDir, 'post.log');

               // Ensure logs directory exists
               if (!existsSync(logsDir)) {
                  mkdirSync(logsDir, { recursive: true });
               }

               // Clear log file on startup
               if (existsSync(logFilePath)) {
                  writeFileSync(logFilePath, '');
               }
            }

            return {
               pinoHttp: {
                  level: logLevel,
                  // Base attributes attached to every single log line across the service
                  base: {
                     service: serviceName,
                     env: nodeEnv,
                  },
                  // Generate request ID for RabbitMQ messages
                  genReqId: () => uuidv7(),
                  customProps: (req: unknown) => {
                     // For RabbitMQ microservice context
                     const context = req as RabbitMQContext;
                     const correlationId = context?.correlationId || uuidv7();
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
                  redact: DEFAULT_PINO_REDACT_OPTIONS,
                  // Dual transport: pino-pretty console + JSON file streaming for development
                  transport:
                     isDevelopment && logFilePath
                        ? {
                             targets: [
                                {
                                   target: 'pino-pretty',
                                   level: logLevel,
                                   options: {
                                      colorize: true,
                                      singleLine: true,
                                      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
                                      ignore: 'pid,hostname',
                                   },
                                },
                                {
                                   target: 'pino/file',
                                   level: logLevel,
                                   options: {
                                      destination: logFilePath,
                                      mkdir: true,
                                   },
                                },
                             ],
                          }
                        : !isProduction
                          ? {
                               target: 'pino-pretty',
                               options: {
                                  colorize: true,
                                  singleLine: true,
                                  translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
                                  ignore: 'pid,hostname',
                               },
                            }
                          : undefined,
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
                        // Only serialize basic result info, avoid dumping large payloads
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
export class PostLoggerModule {}
