import { Specification, PredicateSpecification } from '@common/domain/specifications';

class IsEvenSpecification extends Specification<number> {
   protected readonly errorCode = 'NUMBER.NOT_EVEN';

   isSatisfiedBy(candidate: number): boolean {
      return candidate % 2 === 0;
   }
}

class IsPositiveSpecification extends Specification<number> {
   protected readonly errorCode = 'NUMBER.NOT_POSITIVE';

   isSatisfiedBy(candidate: number): boolean {
      return candidate > 0;
   }
}

describe('Specification Pattern (Base and Composites)', () => {
   const isEven = new IsEvenSpecification();
   const isPositive = new IsPositiveSpecification();

   describe('Single Specification', () => {
      it('should return true and Result.ok when satisfied', () => {
         expect(isEven.isSatisfiedBy(4)).toBe(true);
         const res = isEven.validate(4);
         expect(res.isSuccess()).toBe(true);
      });

      it('should return false and Result.fail with errorCode when not satisfied', () => {
         expect(isEven.isSatisfiedBy(3)).toBe(false);
         const res = isEven.validate(3);
         expect(res.isFailure()).toBe(true);
         expect(res.getError()).toBe('NUMBER.NOT_EVEN');
      });
   });

   describe('AndSpecification', () => {
      const isPositiveEven = isEven.and(isPositive);

      it('should be satisfied only when both specifications are satisfied', () => {
         expect(isPositiveEven.isSatisfiedBy(4)).toBe(true);
         expect(isPositiveEven.validate(4).isSuccess()).toBe(true);

         expect(isPositiveEven.isSatisfiedBy(-2)).toBe(false);
         const negResult = isPositiveEven.validate(-2);
         expect(negResult.isFailure()).toBe(true);
         expect(negResult.getError()).toBe('NUMBER.NOT_POSITIVE');

         expect(isPositiveEven.isSatisfiedBy(3)).toBe(false);
         const oddResult = isPositiveEven.validate(3);
         expect(oddResult.isFailure()).toBe(true);
         expect(oddResult.getError()).toBe('NUMBER.NOT_EVEN');
      });
   });

   describe('OrSpecification', () => {
      const isEvenOrPositive = isEven.or(isPositive);

      it('should be satisfied when either specification is satisfied', () => {
         expect(isEvenOrPositive.isSatisfiedBy(3)).toBe(true); // positive
         expect(isEvenOrPositive.isSatisfiedBy(-2)).toBe(true); // even
         expect(isEvenOrPositive.validate(3).isSuccess()).toBe(true);

         expect(isEvenOrPositive.isSatisfiedBy(-3)).toBe(false); // neither
         const res = isEvenOrPositive.validate(-3);
         expect(res.isFailure()).toBe(true);
      });
   });

   describe('NotSpecification', () => {
      const isOdd = isEven.not('NUMBER.NOT_ODD');

      it('should invert the specification evaluation', () => {
         expect(isOdd.isSatisfiedBy(3)).toBe(true);
         expect(isOdd.validate(3).isSuccess()).toBe(true);

         expect(isOdd.isSatisfiedBy(4)).toBe(false);
         const res = isOdd.validate(4);
         expect(res.isFailure()).toBe(true);
         expect(res.getError()).toBe('NUMBER.NOT_ODD');
      });
   });

   describe('PredicateSpecification', () => {
      const isUnderHundred = new PredicateSpecification<number>(
         (n) => n < 100,
         'NUMBER.TOO_LARGE',
         (n) => ({ max: 100, actual: n }),
      );

      it('should evaluate predicate and dynamic parameters', () => {
         expect(isUnderHundred.isSatisfiedBy(50)).toBe(true);
         expect(isUnderHundred.validate(50).isSuccess()).toBe(true);

         expect(isUnderHundred.isSatisfiedBy(150)).toBe(false);
         const res = isUnderHundred.validate(150);
         expect(res.isFailure()).toBe(true);
         expect(res.getError()).toBe('NUMBER.TOO_LARGE');
         expect(res.getParams()).toEqual({ max: 100, actual: 150 });
      });
   });
});
