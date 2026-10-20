import { z } from 'zod';
import { TRACE_EXPORTER_TYPE, TRACING_DEFAULTS } from '@common/tracing/tracing.constants';

/**
 * Zod schema for OpenTelemetry and Distributed Tracing configuration.
 * Centralized inside @common/config for maintainability and single-point-of-truth.
 */
export const tracingEnvSchema = z.object({
   NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
   SERVICE_NAME: z.string().default(TRACING_DEFAULTS.DEFAULT_SERVICE_NAME),
   OTEL_ENABLED: z
      .preprocess((val) => {
         if (typeof val === 'string') {
            return val.toLowerCase() === 'true' || val === '1';
         }
         return val === undefined ? true : Boolean(val);
      }, z.boolean())
      .default(true),
   OTEL_EXPORTER_OTLP_ENDPOINT: z.string().default(TRACING_DEFAULTS.DEFAULT_OTLP_ENDPOINT),
   OTEL_EXPORTER_TYPE: z
      .enum([TRACE_EXPORTER_TYPE.OTLP, TRACE_EXPORTER_TYPE.CONSOLE, TRACE_EXPORTER_TYPE.NOOP])
      .default(TRACE_EXPORTER_TYPE.OTLP),
});

export type TracingEnvConfig = z.infer<typeof tracingEnvSchema>;

/**
 * Validates tracing environment variables strictly using Zod.
 * Never accesses raw process.env without schema verification.
 */
export function validateTracingEnv(rawEnv: Record<string, unknown> = process.env): TracingEnvConfig {
   const result = tracingEnvSchema.safeParse(rawEnv);
   if (!result.success) {
      const issues = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
      throw new Error(`Tracing environment validation failed:\n${issues}`);
   }
   return result.data;
}
