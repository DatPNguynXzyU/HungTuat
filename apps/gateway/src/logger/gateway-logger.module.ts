import { Global, Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { IncomingMessage, ServerResponse } from 'http';
import { ReqId } from 'pino-http';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { AppLogger, CORRELATION_ID_HEADER, DEFAULT_PINO_REDACT_OPTIONS, REQUEST_ID_HEADER, uuidv7 } from '@common';
import { GatewayConfigService } from '@/config';

interface ExtendedRequest extends IncomingMessage {
   id: ReqId;
   query?: Record<string, unknown>;
   params?: Record<string, unknown>;
   body?: Record<string, unknown>;
   remoteAddress?: string;
   remotePort?: number;
   ip?: string;
   user?: {
      id?: string;
      userId?: string;
      sub?: string;
      [key: string]: unknown;
   };
   userId?: string;
   action?: string;
   customLogMessage?: string;
}

interface ExtendedError extends Error {
   type?: string;
   code?: string | number;
   statusCode?: number;
   status?: number;
   params?: Record<string, unknown>;
}

export function createGatewayLoggerOptions(config: GatewayConfigService) {
   const nodeEnv = config.nodeEnv;
   const isProduction = config.isProduction;
   const isDevelopment = config.isDevelopment;
   const serviceName = config.serviceName;
   const logLevel = config.logLevel;

   // Clear and prepare log file for development environment
   let logFilePath: string | undefined;
   if (isDevelopment) {
      const logsDir = join(process.cwd(), 'apps/gateway/logs');
      logFilePath = join(logsDir, 'gateway.log');

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
      forRoutes: ['*'],
      pinoHttp: {
         level: logLevel,
         // Base attributes attached to every single log line across the service
         base: {
            service: serviceName,
            env: nodeEnv,
         },
         autoLogging: {
            ignore: (req: IncomingMessage) => {
               const url = req.url ? req.url.split('?')[0] : '';
               return (
                  url === '/' ||
                  url === '/health' ||
                  url.startsWith('/health/') ||
                  url === '/api/v1/health' ||
                  url.startsWith('/api/v1/health/')
               );
            },
         },
         genReqId: (req: IncomingMessage, res: ServerResponse) => {
            const incomingId = req.headers[CORRELATION_ID_HEADER] || req.headers[REQUEST_ID_HEADER];
            const traceId = (Array.isArray(incomingId) ? incomingId[0] : incomingId) || uuidv7();
            req.headers[CORRELATION_ID_HEADER] = traceId;
            res.setHeader(CORRELATION_ID_HEADER, traceId);
            res.setHeader(REQUEST_ID_HEADER, traceId);
            return traceId;
         },
         customProps: (req: IncomingMessage) => {
            const extendedReq = req as ExtendedRequest;
            const incomingId = req.headers[CORRELATION_ID_HEADER] || req.headers[REQUEST_ID_HEADER];
            const correlationId = (Array.isArray(incomingId) ? incomingId[0] : incomingId) || extendedReq.id;
            const userId =
               extendedReq.user?.userId || extendedReq.user?.id || extendedReq.user?.sub || extendedReq.userId;

            return {
               correlationId,
               ...(userId ? { userId } : {}),
               ...(extendedReq.action ? { action: extendedReq.action } : {}),
            };
         },
         customAttributeKeys: {
            req: 'req',
            res: 'res',
            err: 'err',
            responseTime: 'responseTimeMs',
         },
         customSuccessMessage: (req: IncomingMessage, res: ServerResponse) => {
            const extendedReq = req as ExtendedRequest;
            if (extendedReq.customLogMessage) {
               return extendedReq.customLogMessage;
            }
            return `HTTP ${extendedReq.method || 'GET'} ${extendedReq.url || '/'} completed with status ${res.statusCode}`;
         },
         customErrorMessage: (req: IncomingMessage, _res: ServerResponse, error: Error) => {
            const extendedReq = req as ExtendedRequest;
            if (extendedReq.customLogMessage) {
               return extendedReq.customLogMessage;
            }
            return error.message || `HTTP ${extendedReq.method || 'GET'} ${extendedReq.url || '/'} failed`;
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
            req(rawReq: unknown) {
               const req = rawReq as ExtendedRequest;
               const remoteAddress =
                  req.ip ||
                  (req.headers ? (req.headers['x-forwarded-for'] as string) : undefined) ||
                  req.socket?.remoteAddress ||
                  req.remoteAddress;

               return {
                  id: req.id,
                  method: req.method,
                  url: req.url,
                  remoteAddress,
                  userAgent: req.headers ? (req.headers['user-agent'] as string) : undefined,
                  referer: req.headers ? (req.headers['referer'] as string) : undefined,
                  query: req.query,
                  params: req.params,
                  ...(req.body !== undefined ? { body: req.body } : {}),
               };
            },
            res(rawRes: unknown) {
               const res = rawRes as ServerResponse;
               return {
                  statusCode: res.statusCode,
               };
            },
            err(rawErr: unknown) {
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
}

@Global()
@Module({
   imports: [
      PinoLoggerModule.forRootAsync({
         inject: [GatewayConfigService],
         useFactory: createGatewayLoggerOptions,
      }),
   ],
   providers: [AppLogger],
   exports: [PinoLoggerModule, AppLogger],
})
export class GatewayLoggerModule {}
