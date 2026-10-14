/**
 * Result pattern for functional error handling without exceptions.
 * Encapsulates operation outcome as either Success(value) or Failure(error, params).
 */
export class Result<T> {
   private constructor(
      private readonly success: boolean,
      private readonly error?: string,
      private readonly value?: T,
      private readonly params?: Record<string, unknown>,
   ) {}

   /**
    * Creates a successful Result containing a value.
    */
   static ok<U>(value: U): Result<U> {
      return new Result<U>(true, undefined, value);
   }

   /**
    * Creates a failed Result containing an error string and optional dynamic params.
    */
   static fail<U = never>(error: string, params?: Record<string, unknown>): Result<U> {
      return new Result<U>(false, error, undefined, params);
   }

   /**
    * Returns true if the operation succeeded.
    */
   isSuccess(): boolean {
      return this.success;
   }

   /**
    * Returns true if the operation failed.
    */
   isFailure(): boolean {
      return !this.success;
   }

   /**
    * Retrieves the unwrapped value or throws an Error if the result is a failure.
    */
   getValue(): T {
      if (!this.success) {
         throw new Error('Cannot get value from failed result');
      }
      return this.value as T;
   }

   /**
    * Retrieves the error message or throws an Error if the result is a success.
    */
   getError(): string {
      if (this.success) {
         throw new Error('Cannot get error from successful result');
      }
      return this.error as string;
   }

   /**
    * Retrieves optional dynamic parameters for i18n interpolation.
    */
   getParams(): Record<string, unknown> | undefined {
      return this.params;
   }
}
