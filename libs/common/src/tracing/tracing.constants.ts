/**
 * OpenTelemetry Tracing Constants & Header Definitions
 */
export const TRACING_HEADERS = {
   TRACEPARENT: 'traceparent',
   TRACESTATE: 'tracestate',
   CORRELATION_ID: 'x-correlation-id',
   REQUEST_ID: 'x-request-id',
   TRACE_ID: 'x-trace-id',
   SPAN_ID: 'x-span-id',
   CALLER_SERVICE: 'x-caller-service',
} as const;

export const TRACING_ATTRIBUTES = {
   CORRELATION_ID: 'omni.correlation_id',
   REQUEST_ID: 'omni.request_id',
   USER_ID: 'omni.user_id',
   CALLER_SERVICE: 'omni.caller_service',
   ERROR_CODE: 'omni.error_code',
   HTTP_STATUS: 'http.status_code',
   HTTP_METHOD: 'http.method',
   HTTP_ROUTE: 'http.route',
   RPC_SYSTEM: 'rpc.system',
   RPC_SERVICE: 'rpc.service',
   RPC_METHOD: 'rpc.method',
   MESSAGING_SYSTEM: 'messaging.system',
   MESSAGING_DESTINATION: 'messaging.destination',
   MESSAGING_OPERATION: 'messaging.operation',
   REDIS_COMMAND: 'db.redis.command',
   REDIS_KEY: 'db.redis.key',
} as const;

export const TRACE_EXPORTER_TYPE = {
   OTLP: 'otlp',
   CONSOLE: 'console',
   NOOP: 'noop',
} as const;

export type TraceExporterType = (typeof TRACE_EXPORTER_TYPE)[keyof typeof TRACE_EXPORTER_TYPE];

export const PROCESS_SIGNALS = {
   SIGTERM: 'SIGTERM',
   SIGINT: 'SIGINT',
} as const;

export type ProcessSignal = (typeof PROCESS_SIGNALS)[keyof typeof PROCESS_SIGNALS];

export const SHUTDOWN_SIGNALS: readonly NodeJS.Signals[] = [PROCESS_SIGNALS.SIGTERM, PROCESS_SIGNALS.SIGINT] as const;

export const TRACING_DEFAULTS = {
   TRACER_NAME: 'omni-services-tracer',
   DEFAULT_VERSION: '0.0.1',
   DEFAULT_SERVICE_NAME: 'omni-service',
   DEFAULT_OTLP_ENDPOINT: 'http://localhost:4318',
   DEFAULT_EXPORTER_TYPE: TRACE_EXPORTER_TYPE.OTLP,
} as const;

export const TRACING_SERVICES = {
   TRACER_NAME: TRACING_DEFAULTS.TRACER_NAME,
   DEFAULT_VERSION: TRACING_DEFAULTS.DEFAULT_VERSION,
} as const;
