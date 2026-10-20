import { Test, TestingModule } from '@nestjs/testing';
import { TracingService } from '@common/tracing/tracing.service';
import { TRACING_HEADERS } from '@common/tracing/tracing.constants';

describe('TracingService', () => {
   let service: TracingService;

   beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
         providers: [TracingService],
      }).compile();

      service = module.get<TracingService>(TracingService);
   });

   it('should be defined', () => {
      expect(service).toBeDefined();
   });

   it('should start an active span and return function result', async () => {
      const result = await service.startActiveSpan('test-span', (span) => {
         service.setAttributes({ 'test.key': 'test.value' }, span);
         service.setCorrelationId('corr-12345', span);
         service.setUserId('user-67890', span);
         return 'test-output';
      });

      expect(result).toBe('test-output');
   });

   it('should record exception and rethrow when active span callback throws', async () => {
      const testError = new Error('Span test failure');

      await expect(
         service.startActiveSpan('failing-span', () => {
            throw testError;
         }),
      ).rejects.toThrow('Span test failure');
   });

   it('should inject trace context into carrier object', () => {
      const carrier: Record<string, unknown> = {};
      service.inject(carrier);
      expect(typeof carrier).toBe('object');
   });

   it('should extract context from carrier object', () => {
      const carrier = {
         [TRACING_HEADERS.TRACEPARENT]: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
      };
      const extracted = service.extract(carrier);
      expect(extracted).toBeDefined();
   });
});
