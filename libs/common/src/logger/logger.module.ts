import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { IncomingMessage, ServerResponse } from 'http';
import { ReqId } from 'pino-http';
import { isSpanContextValid, trace } from '@opentelemetry/api';
import { AppConfigModule, AppConfigService } from '@common/config';
import { CORRELATION_ID_HEADER, DEFAULT_PINO_REDACT_OPTIONS, REQUEST_ID_HEADER } from '@common/logger/logger.constants';
import { AppLogger } from '@common/logger/logger.service';
import { uuidv7 } from '@common/utils/uuid.util';

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

@Module({
   imports: [
      PinoLoggerModule.forRootAsync({
         imports: [AppConfigModule],
         inject: [AppConfigService],
         useFactory: (config: AppConfigService) => {
            const nodeEnv = config.nodeEnv;
            const isProduction = config.isProduction;
            const serviceName = config.serviceName;
            const logLevel = config.logLevel;

            return {
               forRoutes: ['*'],
               pinoHttp: {
                  level: logLevel,
                  // Base attributes attached to every log line
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
                  mixin: () => {
                     const span = trace.getActiveSpan();
                     if (span) {
                        const spanContext = span.spanContext();
                        if (isSpanContextValid(spanContext)) {
                           return {
                              traceId: spanContext.traceId,
                              spanId: spanContext.spanId,
                              traceFlags: spanContext.traceFlags,
                           };
                        }
                     }
                     return {};
                  },
                  genReqId: (req: IncomingMessage, res: ServerResponse) => {
                     const activeSpan = trace.getActiveSpan();
                     const activeTraceId =
                        activeSpan && isSpanContextValid(activeSpan.spanContext())
                           ? activeSpan.spanContext().traceId
                           : undefined;
                     const incomingId = req.headers[CORRELATION_ID_HEADER] || req.headers[REQUEST_ID_HEADER];
                     const traceId =
                        (Array.isArray(incomingId) ? incomingId[0] : incomingId) || activeTraceId || uuidv7();
                     req.headers[CORRELATION_ID_HEADER] = traceId;
                     res.setHeader(CORRELATION_ID_HEADER, traceId);
                     res.setHeader(REQUEST_ID_HEADER, traceId);
                     return traceId;
                  },
                  customProps: (req: IncomingMessage) => {
                     const extendedReq = req as ExtendedRequest;
                     const incomingId = req.headers[CORRELATION_ID_HEADER] || req.headers[REQUEST_ID_HEADER];
                     const activeSpan = trace.getActiveSpan();
                     const activeTraceId =
                        activeSpan && isSpanContextValid(activeSpan.spanContext())
                           ? activeSpan.spanContext().traceId
                           : undefined;
                     const activeSpanId =
                        activeSpan && isSpanContextValid(activeSpan.spanContext())
                           ? activeSpan.spanContext().spanId
                           : undefined;
                     const correlationId =
                        (Array.isArray(incomingId) ? incomingId[0] : incomingId) || activeTraceId || extendedReq.id;
                     const userId =
                        extendedReq.user?.userId || extendedReq.user?.id || extendedReq.user?.sub || extendedReq.userId;

                     return {
                        correlationId,
                        ...(activeTraceId ? { traceId: activeTraceId } : {}),
                        ...(activeSpanId ? { spanId: activeSpanId } : {}),
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
                  transport: !isProduction
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
         },
      }),
   ],
   providers: [AppLogger],
   exports: [PinoLoggerModule, AppLogger],
})
export class AppLoggerModule {}

export const LoggerModule = AppLoggerModule;
