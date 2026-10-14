import { Result } from '@common/domain/value-objects/result';

describe('Result', () => {
   describe('ok', () => {
      it('should create a successful result with value', () => {
         const result = Result.ok('test-value');

         expect(result.isSuccess()).toBe(true);
         expect(result.isFailure()).toBe(false);
         expect(result.getValue()).toBe('test-value');
         expect(result.getParams()).toBeUndefined();
         expect(() => result.getError()).toThrow('Cannot get error from successful result');
      });

      it('should work with complex object values', () => {
         const data = { id: 1, name: 'Omni' };
         const result = Result.ok(data);

         expect(result.isSuccess()).toBe(true);
         expect(result.getValue()).toEqual(data);
      });
   });

   describe('fail', () => {
      it('should create a failed result with error and params', () => {
         const params = { min: 8, actual: 3 };
         const result = Result.fail<string>('Password too short', params);

         expect(result.isSuccess()).toBe(false);
         expect(result.isFailure()).toBe(true);
         expect(result.getError()).toBe('Password too short');
         expect(result.getParams()).toEqual(params);
         expect(() => result.getValue()).toThrow('Cannot get value from failed result');
      });

      it('should create a failed result without params', () => {
         const result = Result.fail<number>('Invalid number');

         expect(result.isFailure()).toBe(true);
         expect(result.getError()).toBe('Invalid number');
         expect(result.getParams()).toBeUndefined();
      });
   });
});
