import {
   ConsoleTraceExporterStrategy,
   NoopTraceExporterStrategy,
   OtlpTraceExporterStrategy,
   TraceExporterFactory,
} from '@common/tracing/strategies/trace-exporter.strategy';
import { TRACE_EXPORTER_TYPE } from '@common/tracing/tracing.constants';

describe('TraceExporterStrategy', () => {
   describe('OtlpTraceExporterStrategy', () => {
      it('should create an OTLPTraceExporter instance with correct url', () => {
         const strategy = new OtlpTraceExporterStrategy('http://localhost:4318');
         const exporter = strategy.createExporter();
         expect(exporter).toBeDefined();
      });

      it('should handle url that already ends with /v1/traces', () => {
         const strategy = new OtlpTraceExporterStrategy('http://localhost:4318/v1/traces');
         const exporter = strategy.createExporter();
         expect(exporter).toBeDefined();
      });
   });

   describe('ConsoleTraceExporterStrategy', () => {
      it('should create a ConsoleSpanExporter instance', () => {
         const strategy = new ConsoleTraceExporterStrategy();
         const exporter = strategy.createExporter();
         expect(exporter).toBeDefined();
      });
   });

   describe('NoopTraceExporterStrategy', () => {
      it('should export with code 0 and shutdown cleanly', async () => {
         const strategy = new NoopTraceExporterStrategy();
         const exporter = strategy.createExporter();
         let callbackResult: { code: number } | undefined;

         exporter.export([], (res) => {
            callbackResult = res;
         });

         expect(callbackResult).toEqual({ code: 0 });
         await expect(exporter.shutdown()).resolves.toBeUndefined();
      });
   });

   describe('TraceExporterFactory', () => {
      it('should return NoopTraceExporterStrategy when enabled is false', () => {
         const strategy = TraceExporterFactory.createStrategy({ enabled: false });
         expect(strategy).toBeInstanceOf(NoopTraceExporterStrategy);
      });

      it('should return ConsoleTraceExporterStrategy when exporterType is console', () => {
         const strategy = TraceExporterFactory.createStrategy({
            enabled: true,
            exporterType: TRACE_EXPORTER_TYPE.CONSOLE,
         });
         expect(strategy).toBeInstanceOf(ConsoleTraceExporterStrategy);
      });

      it('should return OtlpTraceExporterStrategy by default when enabled', () => {
         const strategy = TraceExporterFactory.createStrategy({
            enabled: true,
            endpoint: 'http://jaeger:4318',
         });
         expect(strategy).toBeInstanceOf(OtlpTraceExporterStrategy);
      });
   });
});
