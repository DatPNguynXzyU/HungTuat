import { RmqContext } from '@nestjs/microservices';
import { RmqTraceAdapter } from '@common/tracing/adapters/rmq-trace.adapter';
import { TRACING_HEADERS } from '@common/tracing/tracing.constants';

describe('RmqTraceAdapter', () => {
   describe('createRecord', () => {
      it('should create an RmqRecord with data and injected trace headers', () => {
         const data = { userId: 'u123', email: 'test@example.com' };
         const record = RmqTraceAdapter.createRecord(data, {
            'x-custom-header': 'custom-val',
         });

         expect(record.data).toEqual(data);
         expect(record.options).toBeDefined();
         expect(record.options?.headers).toBeDefined();
         expect(record.options?.headers?.['x-custom-header']).toBe('custom-val');
      });
   });

   describe('extractHeaders and extractContext', () => {
      it('should extract headers from mock RmqContext', () => {
         const mockHeaders = {
            [TRACING_HEADERS.TRACEPARENT]: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
            [TRACING_HEADERS.CORRELATION_ID]: 'corr-999',
         };
         const mockContext = {
            getMessage: () => ({
               properties: {
                  headers: mockHeaders,
               },
            }),
         } as unknown as RmqContext;

         const headers = RmqTraceAdapter.extractHeaders(mockContext);
         expect(headers).toEqual(mockHeaders);

         const extractedCtx = RmqTraceAdapter.extractContext(mockContext);
         expect(extractedCtx).toBeDefined();
      });

      it('should return empty headers if context has no message', () => {
         const headers = RmqTraceAdapter.extractHeaders(null);
         expect(headers).toEqual({});
      });
   });

   describe('runInConsumerSpan', () => {
      it('should execute callback inside a consumer span', async () => {
         const mockContext = {
            getMessage: () => ({
               properties: {
                  headers: {},
               },
            }),
         } as unknown as RmqContext;

         const result = await RmqTraceAdapter.runInConsumerSpan(mockContext, 'test.consume', (span) => {
            expect(span).toBeDefined();
            return 'processed';
         });

         expect(result).toBe('processed');
      });

      it('should record exception and rethrow if consumer handler throws', async () => {
         const mockContext = {
            getMessage: () => ({
               properties: {
                  headers: {},
               },
            }),
         } as unknown as RmqContext;

         await expect(
            RmqTraceAdapter.runInConsumerSpan(mockContext, 'test.consume.error', () => {
               throw new Error('Consumer processing failure');
            }),
         ).rejects.toThrow('Consumer processing failure');
      });
   });
});
