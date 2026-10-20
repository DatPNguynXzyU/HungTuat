import { RmqContext, RmqRecord, RmqRecordBuilder } from '@nestjs/microservices';
import { context, propagation, trace, Context, Span, SpanKind, SpanStatusCode } from '@opentelemetry/api';
import { TRACING_HEADERS, TRACING_SERVICES } from '@common/tracing/tracing.constants';

interface AmqpMessageLike {
   properties?: {
      headers?: Record<string, unknown>;
   };
}

/**
 * Adapter Pattern: RmqTraceAdapter bridges NestJS RabbitMQ messages
 * and OpenTelemetry W3C distributed trace context propagation.
 */
export class RmqTraceAdapter {
   /**
    * Wraps a payload into an RmqRecord with active OpenTelemetry trace context
    * and correlation ID injected into AMQP message headers.
    */
   static createRecord<T>(data: T, customHeaders: Record<string, unknown> = {}): RmqRecord<T> {
      const headers: Record<string, string> = {};

      for (const [key, value] of Object.entries(customHeaders)) {
         if (value !== undefined && value !== null) {
            headers[key] = typeof value === 'string' ? value : JSON.stringify(value);
         }
      }

      // Inject active OpenTelemetry context into headers
      propagation.inject(context.active(), headers);

      const span = trace.getActiveSpan();
      if (span) {
         const spanContext = span.spanContext();
         if (!headers[TRACING_HEADERS.TRACE_ID]) {
            headers[TRACING_HEADERS.TRACE_ID] = spanContext.traceId;
         }
      }

      return new RmqRecordBuilder(data).setOptions({ headers }).build() as RmqRecord<T>;
   }

   /**
    * Extracts trace context from a NestJS RmqContext or raw AMQP message.
    */
   static extractContext(rmqContext?: RmqContext | AmqpMessageLike | null): Context {
      const headers = this.extractHeaders(rmqContext);
      return propagation.extract(context.active(), headers);
   }

   /**
    * Extracts headers dictionary safely from RmqContext.
    */
   static extractHeaders(rmqContext?: RmqContext | AmqpMessageLike | null): Record<string, unknown> {
      if (!rmqContext || typeof rmqContext !== 'object') {
         return {};
      }

      const ctxObj = rmqContext as { getMessage?: () => unknown };
      let rawMsg: unknown = undefined;

      if (typeof ctxObj.getMessage === 'function') {
         rawMsg = ctxObj.getMessage();
      } else {
         rawMsg = rmqContext;
      }

      const msg = rawMsg as AmqpMessageLike | undefined;
      return (msg?.properties?.headers as Record<string, unknown>) || {};
   }

   /**
    * Runs a message handler inside an extracted OpenTelemetry CONSUMER span.
    */
   static async runInConsumerSpan<T>(
      rmqContext: RmqContext,
      spanName: string,
      fn: (span: Span) => Promise<T> | T,
   ): Promise<T> {
      const parentContext = this.extractContext(rmqContext);
      const tracer = trace.getTracer(TRACING_SERVICES.TRACER_NAME);

      return tracer.startActiveSpan(
         spanName,
         {
            kind: SpanKind.CONSUMER,
         },
         parentContext,
         async (span: Span) => {
            try {
               const result = await fn(span);
               span.setStatus({ code: SpanStatusCode.OK });
               return result;
            } catch (error: unknown) {
               if (error instanceof Error) {
                  span.recordException(error);
               }
               span.setStatus({
                  code: SpanStatusCode.ERROR,
                  message: error instanceof Error ? error.message : String(error),
               });
               throw error;
            } finally {
               span.end();
            }
         },
      );
   }
}
