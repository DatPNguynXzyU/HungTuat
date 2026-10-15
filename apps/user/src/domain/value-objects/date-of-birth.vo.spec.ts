import { DateOfBirth } from '@user/domain/value-objects/date-of-birth.vo';

describe('DateOfBirth Value Object', () => {
   it('should successfully parse and validate a valid date string', () => {
      const res = DateOfBirth.create('1995-05-15');
      expect(res.isSuccess()).toBe(true);
      expect(res.getValue().getValue()).toBeInstanceOf(Date);
   });

   it('should fail when date is null, undefined, or empty', () => {
      expect(DateOfBirth.create(null).isFailure()).toBe(true);
      expect(DateOfBirth.create(undefined).isFailure()).toBe(true);
      expect(DateOfBirth.create('').isFailure()).toBe(true);
   });

   it('should fail when date format is invalid', () => {
      const res = DateOfBirth.create('not-a-valid-date');
      expect(res.isFailure()).toBe(true);
   });

   it('should fail when date is in the future', () => {
      const future = new Date(Date.now() + 86400000 * 365);
      const res = DateOfBirth.create(future);
      expect(res.isFailure()).toBe(true);
   });

   it('should fail when calculated age exceeds 125 years', () => {
      const ancient = new Date('1850-01-01');
      const res = DateOfBirth.create(ancient);
      expect(res.isFailure()).toBe(true);
      expect(res.getParams()?.maxAge).toBe(125);
   });

   it('should accurately compute age', () => {
      const dob = DateOfBirth.create('2000-06-15').getValue();
      const refDate = new Date('2026-06-16');
      expect(dob.getAge(refDate)).toBe(26);

      const beforeBirthday = new Date('2026-06-14');
      expect(dob.getAge(beforeBirthday)).toBe(25);
   });

   it('should accurately determine adult status', () => {
      const adult = DateOfBirth.create('1990-01-01').getValue();
      expect(adult.isAdult()).toBe(true);
   });

   it('should compare equality correctly', () => {
      const d1 = DateOfBirth.create('1995-05-15').getValue();
      const d2 = DateOfBirth.create('1995-05-15').getValue();
      const d3 = DateOfBirth.create('1996-05-15').getValue();

      expect(d1.equals(d2)).toBe(true);
      expect(d1.equals(d3)).toBe(false);
      expect(d1.equals(null)).toBe(false);
   });
});
