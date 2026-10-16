import { PROFILE_OPERATIONS, PROFILE_OPERATION_NAMES, type ProfileOperationName } from '@user/constants';
import { AbstractProfileOperation } from '@user/templates/abstract-profile.operation';
import type { BaseProfileOperationContext, ProfileOperationOptions } from '@user/templates/profile-operation.interface';

interface TestParams {
   id: string;
   name?: string;
   options?: ProfileOperationOptions;
}

interface TestContext extends BaseProfileOperationContext {
   id: string;
   name?: string;
}

interface TestResult {
   id: string;
   success: boolean;
}

class ConcreteTestProfileOperation extends AbstractProfileOperation<TestParams, TestContext, TestResult> {
   public createContextMock = jest.fn();
   public beforeValidateMock = jest.fn();
   public validateMock = jest.fn();
   public performOperationMock = jest.fn();
   public syncInfrastructureMock = jest.fn();
   public onSuccessMock = jest.fn();
   public onErrorMock = jest.fn();
   public extractResultMock = jest.fn();

   protected getOperationName(): ProfileOperationName {
      return PROFILE_OPERATION_NAMES.CREATE_PROFILE;
   }

   protected createContext(params: TestParams): TestContext {
      this.createContextMock(params);
      return {
         operation: PROFILE_OPERATIONS.CREATE,
         startTime: Date.now(),
         userId: params.id,
         id: params.id,
         name: params.name,
         options: params.options,
      };
   }

   protected override async beforeValidate(context: TestContext): Promise<void> {
      await this.beforeValidateMock(context);
   }

   protected override async validate(context: TestContext): Promise<void> {
      await this.validateMock(context);
   }

   protected performOperation(context: TestContext): Promise<TestResult> {
      return Promise.resolve(this.performOperationMock(context));
   }

   protected async syncInfrastructure(context: TestContext, result: TestResult): Promise<void> {
      await this.syncInfrastructureMock(context, result);
   }

   protected override async onSuccess(context: TestContext, result: TestResult): Promise<void> {
      await this.onSuccessMock(context, result);
   }

   protected override async onError(context: TestContext, err: unknown): Promise<void> {
      await this.onErrorMock(context, err);
   }

   protected override extractResult(context: TestContext, result: TestResult): TestResult {
      this.extractResultMock(context, result);
      return result;
   }
}

describe('AbstractProfileOperation (Template Method Pattern)', () => {
   let operation: ConcreteTestProfileOperation;

   beforeEach(() => {
      jest.clearAllMocks();
      operation = new ConcreteTestProfileOperation();
   });

   it('should execute the invariant template sequence successfully', async () => {
      const expectedResult: TestResult = { id: 'user-1', success: true };
      operation.performOperationMock.mockResolvedValue(expectedResult);

      const params: TestParams = { id: 'user-1', name: 'Alice' };
      const result = await operation.execute(params);

      expect(result).toEqual(expectedResult);
      expect(operation.createContextMock).toHaveBeenCalledWith(params);
      expect(operation.beforeValidateMock).toHaveBeenCalled();
      expect(operation.validateMock).toHaveBeenCalled();
      expect(operation.performOperationMock).toHaveBeenCalled();
      expect(operation.syncInfrastructureMock).toHaveBeenCalledWith(
         expect.objectContaining({ id: 'user-1', name: 'Alice' }),
         expectedResult,
      );
      expect(operation.onSuccessMock).toHaveBeenCalledWith(
         expect.objectContaining({ id: 'user-1', name: 'Alice' }),
         expectedResult,
      );
      expect(operation.extractResultMock).toHaveBeenCalledWith(
         expect.objectContaining({ id: 'user-1', name: 'Alice' }),
         expectedResult,
      );
   });

   it('should short-circuit execution when context.shortCircuited is true', async () => {
      operation.beforeValidateMock.mockImplementation((ctx: TestContext) => {
         ctx.shortCircuited = true;
         return Promise.resolve();
      });

      const params: TestParams = { id: 'user-1', name: 'Alice' };
      const result = await operation.execute(params);

      expect(operation.createContextMock).toHaveBeenCalledWith(params);
      expect(operation.beforeValidateMock).toHaveBeenCalled();
      expect(operation.validateMock).not.toHaveBeenCalled();
      expect(operation.performOperationMock).not.toHaveBeenCalled();
      expect(operation.syncInfrastructureMock).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
   });

   it('should skip validate step when skipValidation option is set', async () => {
      const expectedResult: TestResult = { id: 'user-2', success: true };
      operation.performOperationMock.mockResolvedValue(expectedResult);

      const params: TestParams = { id: 'user-2', options: { skipValidation: true } };
      const result = await operation.execute(params);

      expect(result).toEqual(expectedResult);
      expect(operation.validateMock).not.toHaveBeenCalled();
      expect(operation.performOperationMock).toHaveBeenCalled();
      expect(operation.syncInfrastructureMock).toHaveBeenCalled();
   });

   it('should trigger onError hook and rethrow when validation fails', async () => {
      const validationError = new Error('Validation failed');
      operation.validateMock.mockRejectedValue(validationError);

      const params: TestParams = { id: 'user-3' };
      await expect(operation.execute(params)).rejects.toThrow(validationError);

      expect(operation.onErrorMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'user-3' }), validationError);
      expect(operation.performOperationMock).not.toHaveBeenCalled();
      expect(operation.syncInfrastructureMock).not.toHaveBeenCalled();
   });

   it('should trigger onError hook and rethrow when performOperation fails', async () => {
      const dbError = new Error('Database connection failed');
      operation.performOperationMock.mockRejectedValue(dbError);

      const params: TestParams = { id: 'user-4' };
      await expect(operation.execute(params)).rejects.toThrow(dbError);

      expect(operation.onErrorMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'user-4' }), dbError);
      expect(operation.syncInfrastructureMock).not.toHaveBeenCalled();
   });

   it('should trigger onError hook and rethrow when syncInfrastructure fails', async () => {
      const expectedResult: TestResult = { id: 'user-5', success: true };
      operation.performOperationMock.mockResolvedValue(expectedResult);
      const syncError = new Error('Elasticsearch index failed');
      operation.syncInfrastructureMock.mockRejectedValue(syncError);

      const params: TestParams = { id: 'user-5' };
      await expect(operation.execute(params)).rejects.toThrow(syncError);

      expect(operation.onErrorMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'user-5' }), syncError);
   });
});
