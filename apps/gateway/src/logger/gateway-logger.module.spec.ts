import { IncomingMessage, ServerResponse } from 'http';
import { CORRELATION_ID_HEADER, REQUEST_ID_HEADER } from '@common';
import { AUTH_RESPONSE_MESSAGES } from '@contracts/auth';
import { GatewayConfigService } from '@/config';
import { createGatewayLoggerOptions, GatewayLoggerModule } from './gateway-logger.module';

describe('GatewayLoggerModule', () => {
   let mockConfig: GatewayConfigService;

   beforeEach(() => {
      mockConfig = {
         nodeEnv: 'test',
         isProduction: false,
         serviceName: 'api-gateway',
         logLevel: 'info',
      } as unknown as GatewayConfigService;
   });

   it('should be defined', () => {
      expect(GatewayLoggerModule).toBeDefined();
   });

   describe('createGatewayLoggerOptions', () => {
      it('should configure forRoutes with explicit wildcard ["*"]', () => {
         const options = createGatewayLoggerOptions(mockConfig);
         expect(options.forRoutes).toEqual(['*']);
      });

      it('should configure autoLogging.ignore to filter out health check routes', () => {
         const options = createGatewayLoggerOptions(mockConfig);
         const pinoHttp = options.pinoHttp as {
            autoLogging?: { ignore?: (req: IncomingMessage) => boolean };
         };
         expect(pinoHttp.autoLogging).toBeDefined();
         expect(typeof pinoHttp.autoLogging?.ignore).toBe('function');

         const ignore = pinoHttp.autoLogging?.ignore;
         if (!ignore) {
            throw new Error('autoLogging.ignore is undefined');
         }

         // Ignored health check endpoints
         expect(ignore({ url: '/' } as IncomingMessage)).toBe(true);
         expect(ignore({ url: '/health' } as IncomingMessage)).toBe(true);
         expect(ignore({ url: '/health/ready' } as IncomingMessage)).toBe(true);
         expect(ignore({ url: '/health/redis' } as IncomingMessage)).toBe(true);
         expect(ignore({ url: '/health/grpc' } as IncomingMessage)).toBe(true);
         expect(ignore({ url: '/api/v1/health' } as IncomingMessage)).toBe(true);
         expect(ignore({ url: '/api/v1/health/redis' } as IncomingMessage)).toBe(true);
         expect(ignore({ url: '/health?format=json' } as IncomingMessage)).toBe(true);

         // Non-health endpoints that SHOULD be logged
         expect(ignore({ url: '/api/v1/auth/check-email?email=test@example.com' } as IncomingMessage)).toBe(false);
         expect(ignore({ url: '/api/v1/auth/login' } as IncomingMessage)).toBe(false);
         expect(ignore({ url: '/api/v1/users/profile' } as IncomingMessage)).toBe(false);
         expect(ignore({ url: '/api/v1/suppliers' } as IncomingMessage)).toBe(false);
      });

      it('should maintain consistent correlation ID in genReqId and set response headers', () => {
         const options = createGatewayLoggerOptions(mockConfig);
         const pinoHttp = options.pinoHttp as {
            genReqId: (req: IncomingMessage, res: ServerResponse) => string;
         };

         const headers: Record<string, string> = {};
         const mockReq = {
            headers: {
               [CORRELATION_ID_HEADER]: 'existing-trace-id',
            },
         } as unknown as IncomingMessage;

         const mockRes = {
            setHeader: jest.fn((key: string, val: string) => {
               headers[key] = val;
            }),
         } as unknown as ServerResponse;

         const traceId = pinoHttp.genReqId(mockReq, mockRes);

         expect(traceId).toBe('existing-trace-id');
         expect(mockRes.setHeader).toHaveBeenCalledWith(CORRELATION_ID_HEADER, 'existing-trace-id');
         expect(mockRes.setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, 'existing-trace-id');
         expect(mockReq.headers[CORRELATION_ID_HEADER]).toBe('existing-trace-id');
      });

      it('should generate a new UUID if no correlation ID header is provided and set it on req.headers and res', () => {
         const options = createGatewayLoggerOptions(mockConfig);
         const pinoHttp = options.pinoHttp as {
            genReqId: (req: IncomingMessage, res: ServerResponse) => string;
         };

         const mockReq = {
            headers: {},
         } as unknown as IncomingMessage;

         const mockRes = {
            setHeader: jest.fn(),
         } as unknown as ServerResponse;

         const traceId = pinoHttp.genReqId(mockReq, mockRes);

         expect(traceId).toBeDefined();
         expect(typeof traceId).toBe('string');
         expect(mockReq.headers[CORRELATION_ID_HEADER]).toBe(traceId);
         expect(mockRes.setHeader).toHaveBeenCalledWith(CORRELATION_ID_HEADER, traceId);
         expect(mockRes.setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, traceId);
      });

      it('should return correlationId and userId in customProps', () => {
         const options = createGatewayLoggerOptions(mockConfig);
         const pinoHttp = options.pinoHttp as {
            customProps: (req: IncomingMessage) => Record<string, unknown>;
         };

         const mockReq = {
            headers: {
               [CORRELATION_ID_HEADER]: 'test-correlation-id',
            },
            user: { userId: 'usr-123' },
            action: AUTH_RESPONSE_MESSAGES.LOGIN_SUCCESS,
         } as unknown as IncomingMessage;

         const props = pinoHttp.customProps(mockReq);

         expect(props).toEqual({
            correlationId: 'test-correlation-id',
            userId: 'usr-123',
            action: AUTH_RESPONSE_MESSAGES.LOGIN_SUCCESS,
         });
      });

      it('should configure redact with centralized DEFAULT_PINO_REDACT_OPTIONS', () => {
         const options = createGatewayLoggerOptions(mockConfig);
         const pinoHttp = options.pinoHttp as {
            redact: { paths: string[]; censor: string };
         };

         expect(pinoHttp.redact).toBeDefined();
         expect(pinoHttp.redact.censor).toBe('***REDACTED***');
         expect(pinoHttp.redact.paths).toContain('*.password');
         expect(pinoHttp.redact.paths).toContain('req.body.password');
         expect(pinoHttp.redact.paths).toContain('req.query.token');
         expect(pinoHttp.redact.paths).toContain('req.headers.authorization');
      });
   });
});
