import { Money } from '@commerce/domain/value-objects/money.vo';
import { CurrencyEnum } from '@contracts/commerce';

describe('Money Value Object', () => {
   it('should create valid money object', () => {
      const money = new Money(100000, CurrencyEnum.VND);
      expect(money.amount).toBe(100000);
      expect(money.currency).toBe(CurrencyEnum.VND);
      expect(money.toString()).toBe('100000 VND');
   });

   it('should throw error on negative amount', () => {
      expect(() => new Money(-500)).toThrow('Money amount cannot be negative');
   });

   it('should add money of the same currency', () => {
      const m1 = new Money(50000, CurrencyEnum.VND);
      const m2 = new Money(30000, CurrencyEnum.VND);
      const sum = m1.add(m2);
      expect(sum.amount).toBe(80000);
      expect(sum.currency).toBe(CurrencyEnum.VND);
   });

   it('should throw when adding different currencies', () => {
      const m1 = new Money(50000, CurrencyEnum.VND);
      const m2 = new Money(10, CurrencyEnum.USD);
      expect(() => m1.add(m2)).toThrow(/Cannot add money with different currencies/);
   });

   it('should check equality correctly', () => {
      const m1 = new Money(50000, CurrencyEnum.VND);
      const m2 = new Money(50000, CurrencyEnum.VND);
      const m3 = new Money(60000, CurrencyEnum.VND);
      expect(m1.equals(m2)).toBe(true);
      expect(m1.equals(m3)).toBe(false);
   });
});
