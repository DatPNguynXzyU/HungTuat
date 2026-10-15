import { Result } from '@common/domain/value-objects/result';
import type { ISpecification } from '@common/domain/specifications/specification.interface';

/**
 * Abstract base class for specifications providing default composition methods.
 */
export abstract class Specification<T> implements ISpecification<T> {
   /**
    * Checks if candidate satisfies the specification criteria.
    */
   abstract isSatisfiedBy(candidate: T): boolean;

   /**
    * Error code returned when validation fails. Subclasses provide domain-specific translation keys.
    */
   protected abstract readonly errorCode: string;

   /**
    * Dynamic params for i18n interpolation when validation fails. Subclasses can override.
    */
   protected getParams(_candidate: T): Record<string, unknown> | undefined {
      return undefined;
   }

   /**
    * Validates candidate and returns Result.ok() or Result.fail().
    */
   validate(candidate: T): Result<void> {
      if (this.isSatisfiedBy(candidate)) {
         return Result.ok(undefined);
      }
      return Result.fail(this.errorCode, this.getParams(candidate));
   }

   /**
    * Combines this specification with another via logical AND.
    */
   and(other: ISpecification<T>): ISpecification<T> {
      return new AndSpecification(this, other);
   }

   /**
    * Combines this specification with another via logical OR.
    */
   or(other: ISpecification<T>): ISpecification<T> {
      return new OrSpecification(this, other);
   }

   /**
    * Inverts this specification via logical NOT.
    */
   not(errorCode?: string, params?: Record<string, unknown>): ISpecification<T> {
      return new NotSpecification(this, errorCode, params);
   }
}

/**
 * Composite specification combining two specifications via logical AND.
 */
export class AndSpecification<T> extends Specification<T> {
   protected readonly errorCode: string;

   constructor(
      private readonly left: ISpecification<T>,
      private readonly right: ISpecification<T>,
   ) {
      super();
      this.errorCode = 'SPECIFICATION.AND_FAILED';
   }

   isSatisfiedBy(candidate: T): boolean {
      return this.left.isSatisfiedBy(candidate) && this.right.isSatisfiedBy(candidate);
   }

   override validate(candidate: T): Result<void> {
      const leftResult = this.left.validate(candidate);
      if (leftResult.isFailure()) {
         return leftResult;
      }
      return this.right.validate(candidate);
   }
}

/**
 * Composite specification combining two specifications via logical OR.
 */
export class OrSpecification<T> extends Specification<T> {
   protected readonly errorCode: string;

   constructor(
      private readonly left: ISpecification<T>,
      private readonly right: ISpecification<T>,
      customErrorCode?: string,
   ) {
      super();
      this.errorCode = customErrorCode || 'SPECIFICATION.OR_FAILED';
   }

   isSatisfiedBy(candidate: T): boolean {
      return this.left.isSatisfiedBy(candidate) || this.right.isSatisfiedBy(candidate);
   }

   override validate(candidate: T): Result<void> {
      if (this.isSatisfiedBy(candidate)) {
         return Result.ok(undefined);
      }
      const leftResult = this.left.validate(candidate);
      return leftResult.isFailure() ? leftResult : this.right.validate(candidate);
   }
}

/**
 * Composite specification inverting a specification via logical NOT.
 */
export class NotSpecification<T> extends Specification<T> {
   protected readonly errorCode: string;

   constructor(
      private readonly spec: ISpecification<T>,
      customErrorCode?: string,
      private readonly customParams?: Record<string, unknown>,
   ) {
      super();
      this.errorCode = customErrorCode || 'SPECIFICATION.NOT_FAILED';
   }

   isSatisfiedBy(candidate: T): boolean {
      return !this.spec.isSatisfiedBy(candidate);
   }

   protected override getParams(_candidate: T): Record<string, unknown> | undefined {
      return this.customParams;
   }
}

/**
 * Generic specification constructed directly from a predicate function.
 */
export class PredicateSpecification<T> extends Specification<T> {
   constructor(
      private readonly predicate: (candidate: T) => boolean,
      protected readonly errorCode: string,
      private readonly paramsProvider?: (candidate: T) => Record<string, unknown> | undefined,
   ) {
      super();
   }

   isSatisfiedBy(candidate: T): boolean {
      return this.predicate(candidate);
   }

   protected override getParams(candidate: T): Record<string, unknown> | undefined {
      return this.paramsProvider ? this.paramsProvider(candidate) : undefined;
   }
}
