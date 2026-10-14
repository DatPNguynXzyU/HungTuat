import type { SetOptional, SetRequired } from '@common/types/utility.types';

describe('Utility Types', () => {
   it('should properly make specified keys optional with SetOptional', () => {
      interface TestEntity {
         id: string;
         name: string;
         age: number;
      }

      type TestOptional = SetOptional<TestEntity, 'id' | 'age'>;

      const validObj: TestOptional = {
         name: 'Alice',
      };

      const validWithOptional: TestOptional = {
         id: 'uuid-1',
         name: 'Alice',
         age: 30,
      };

      expect(validObj.name).toBe('Alice');
      expect(validWithOptional.id).toBe('uuid-1');
   });

   it('should properly make specified keys required with SetRequired', () => {
      interface TestOptions {
         timeout?: number;
         retries?: number;
         debug?: boolean;
      }

      type TestStrict = SetRequired<TestOptions, 'timeout'>;

      const validObj: TestStrict = {
         timeout: 5000,
      };

      expect(validObj.timeout).toBe(5000);
   });
});
