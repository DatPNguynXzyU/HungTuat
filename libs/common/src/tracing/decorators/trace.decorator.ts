import { trace, SpanStatusCode, Span } from '@opentelemetry/api';
import { SENSITIVE_LOG_KEYS } from '@common/logger/logger.constants';
import { TRACING_SERVICES } from '@common/tracing/tracing.constants';

const SENSITIVE_KEYS = new Set(SENSITIVE_LOG_KEYS.map((k) => k.toLowerCase()));

function sanitizeValue(value: unknown): unknown {
   if (value === null || value === undefined || typeof value !== 'object') {
      return value;
   }

   if (Array.isArray(value)) {
      return value.map(sanitizeValue);
   }

   const sanitized: Record<string, unknown> = {};
   for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) {
         sanitized[k] = '***REDACTED***';
      } else if (typeof v === 'object' && v !== null) {
         sanitized[k] = sanitizeValue(v);
      } else {
         sanitized[k] = v;
      }
   }
   return sanitized;
}

export interface ITraceDecoratorOptions {
   /**
    * Custom span name. Defaults to `${TargetClass}.${methodName}`.
    */
   name?: string;
   /**
    * Whether to record method arguments as span attributes. Defaults to false.
    */
   recordArgs?: boolean;
}

/**
 * Decorator Pattern: @Trace wraps a method execution within an OpenTelemetry span,
 * recording execution duration, parameters (sanitized), and errors.
 */
export function Trace(options: ITraceDecoratorOptions = {}): MethodDecorator {
   return (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
      const originalMethod = descriptor.value as (...args: unknown[]) => unknown;
      const className = target.constructor.name || 'Anonymous';
      const methodName = String(propertyKey);
      const spanName = options.name || `${className}.${methodName}`;

      descriptor.value = async function (...args: unknown[]) {
         const tracer = trace.getTracer(TRACING_SERVICES.TRACER_NAME);

         return tracer.startActiveSpan(spanName, async (span: Span) => {
            try {
               span.setAttribute('code.function', methodName);
               span.setAttribute('code.namespace', className);

               if (options.recordArgs && args.length > 0) {
                  try {
                     const sanitizedArgs = sanitizeValue(args);
                     span.setAttribute('code.args', JSON.stringify(sanitizedArgs));
                  } catch {
                     // Ignore serialization errors
                  }
               }

               const result = await originalMethod.apply(this, args);
               span.setStatus({ code: SpanStatusCode.OK });
               return result;
            } catch (error: unknown) {
               if (error instanceof Error) {
                  span.recordException(error);
               } else {
                  span.recordException({
                     name: 'Error',
                     message: String(error),
                  });
               }

               span.setStatus({
                  code: SpanStatusCode.ERROR,
                  message: error instanceof Error ? error.message : String(error),
               });
               throw error;
            } finally {
               span.end();
            }
         });
      };

      return descriptor;
   };
}
