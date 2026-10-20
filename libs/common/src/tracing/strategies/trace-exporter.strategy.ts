import { ConsoleSpanExporter, SpanExporter } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { TRACE_EXPORTER_TYPE, TraceExporterType, TRACING_DEFAULTS } from '@common/tracing/tracing.constants';

/**
 * Strategy pattern interface for creating OpenTelemetry trace exporters.
 */
export interface ITraceExporterStrategy {
   createExporter(): SpanExporter;
}

/**
 * Strategy for exporting traces to Jaeger / OpenTelemetry Collector over OTLP HTTP.
 */
export class OtlpTraceExporterStrategy implements ITraceExporterStrategy {
   constructor(private readonly endpoint: string) {}

   createExporter(): SpanExporter {
      const url = this.endpoint.endsWith('/v1/traces')
         ? this.endpoint
         : `${this.endpoint.replace(/\/+$/, '')}/v1/traces`;

      return new OTLPTraceExporter({
         url,
      });
   }
}

/**
 * Strategy for outputting spans to console (useful in test or local debugging).
 */
export class ConsoleTraceExporterStrategy implements ITraceExporterStrategy {
   createExporter(): SpanExporter {
      return new ConsoleSpanExporter();
   }
}

/**
 * No-op strategy for environments where tracing is explicitly disabled.
 */
export class NoopTraceExporterStrategy implements ITraceExporterStrategy {
   createExporter(): SpanExporter {
      return {
         export(_spans, resultCallback) {
            resultCallback({ code: 0 }); // ExportResultCode.SUCCESS
         },
         async shutdown(): Promise<void> {
            return Promise.resolve();
         },
      };
   }
}

export interface ITraceExporterFactoryOptions {
   enabled: boolean;
   endpoint?: string;
   exporterType?: TraceExporterType;
}

/**
 * Factory for creating the appropriate trace exporter strategy.
 */
export class TraceExporterFactory {
   static createStrategy(options: ITraceExporterFactoryOptions): ITraceExporterStrategy {
      if (!options.enabled) {
         return new NoopTraceExporterStrategy();
      }

      if (options.exporterType === TRACE_EXPORTER_TYPE.CONSOLE) {
         return new ConsoleTraceExporterStrategy();
      }

      const endpoint =
         options.endpoint || process.env.OTEL_EXPORTER_OTLP_ENDPOINT || TRACING_DEFAULTS.DEFAULT_OTLP_ENDPOINT;
      return new OtlpTraceExporterStrategy(endpoint);
   }
}
