import { validateTracingEnv } from '@common/config/tracing-env.schema';
import { TRACE_EXPORTER_TYPE, TRACING_DEFAULTS } from '@common/tracing/tracing.constants';

describe('TracingEnvSchema', () => {
   it('should validate with valid default values', () => {
      const parsed = validateTracingEnv({});
      expect(parsed.SERVICE_NAME).toBe(TRACING_DEFAULTS.DEFAULT_SERVICE_NAME);
      expect(parsed.OTEL_ENABLED).toBe(true);
      expect(parsed.OTEL_EXPORTER_OTLP_ENDPOINT).toBe(TRACING_DEFAULTS.DEFAULT_OTLP_ENDPOINT);
      expect(parsed.OTEL_EXPORTER_TYPE).toBe(TRACE_EXPORTER_TYPE.OTLP);
   });

   it('should parse custom environment values properly', () => {
      const parsed = validateTracingEnv({
         NODE_ENV: 'production',
         SERVICE_NAME: 'custom-auth-service',
         OTEL_ENABLED: 'false',
         OTEL_EXPORTER_OTLP_ENDPOINT: 'http://jaeger:4318',
         OTEL_EXPORTER_TYPE: TRACE_EXPORTER_TYPE.CONSOLE,
      });

      expect(parsed.NODE_ENV).toBe('production');
      expect(parsed.SERVICE_NAME).toBe('custom-auth-service');
      expect(parsed.OTEL_ENABLED).toBe(false);
      expect(parsed.OTEL_EXPORTER_OTLP_ENDPOINT).toBe('http://jaeger:4318');
      expect(parsed.OTEL_EXPORTER_TYPE).toBe(TRACE_EXPORTER_TYPE.CONSOLE);
   });

   it('should reject invalid NODE_ENV', () => {
      expect(() =>
         validateTracingEnv({
            NODE_ENV: 'invalid_env',
         }),
      ).toThrow('Tracing environment validation failed');
   });

   it('should reject invalid OTEL_EXPORTER_TYPE', () => {
      expect(() =>
         validateTracingEnv({
            OTEL_EXPORTER_TYPE: 'invalid_type',
         }),
      ).toThrow('Tracing environment validation failed');
   });
});
