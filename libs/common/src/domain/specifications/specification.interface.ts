import type { Result } from '@common/domain/value-objects/result';

/**
 * Core interface for the Specification Pattern in Domain-Driven Design (DDD).
 * Encapsulates reusable business rules that can be evaluated against candidate objects
 * and combined with boolean operators (AND, OR, NOT).
 */
export interface ISpecification<T> {
   /**
    * Checks if the candidate satisfies the specification criteria.
    */
   isSatisfiedBy(candidate: T): boolean;

   /**
    * Validates candidate against domain rules, returning Result.ok() on success
    * or Result.fail(errorCode, params) on failure.
    */
   validate(candidate: T): Result<void>;

   /**
    * Combines this specification with another via logical AND.
    */
   and(other: ISpecification<T>): ISpecification<T>;

   /**
    * Combines this specification with another via logical OR.
    */
   or(other: ISpecification<T>): ISpecification<T>;

   /**
    * Inverts this specification via logical NOT.
    */
   not(errorCode?: string, params?: Record<string, unknown>): ISpecification<T>;
}
