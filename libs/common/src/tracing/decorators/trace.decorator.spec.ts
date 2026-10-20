import { Trace } from '@common/tracing/decorators/trace.decorator';

class TestSampleService {
   @Trace({ name: 'TestSampleService.doSuccess', recordArgs: true })
   async doSuccess(arg1: string, secretToken: { token: string; payload: string }) {
      return await Promise.resolve(`result-${arg1}-${secretToken.payload}`);
   }

   @Trace({ name: 'TestSampleService.doFailure' })
   async doFailure() {
      await Promise.resolve();
      throw new Error('Service method internal failure');
   }
}

describe('@Trace Decorator', () => {
   let service: TestSampleService;

   beforeEach(() => {
      service = new TestSampleService();
   });

   it('should execute wrapped method successfully and return result', async () => {
      const result = await service.doSuccess('sample', {
         token: 'secret123',
         payload: 'public-data',
      });

      expect(result).toBe('result-sample-public-data');
   });

   it('should record exception and rethrow when wrapped method throws', async () => {
      await expect(service.doFailure()).rejects.toThrow('Service method internal failure');
   });
});
