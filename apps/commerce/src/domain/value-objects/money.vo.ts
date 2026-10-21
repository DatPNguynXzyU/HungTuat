import { CurrencyEnum, DEFAULT_CURRENCY, isValidCurrency, type CurrencyType } from '@contracts/commerce';

export class Money {
   private readonly _amount: number;
   private readonly _currency: CurrencyType;

   constructor(amount: number, currency: string = DEFAULT_CURRENCY) {
      if (amount < 0) {
         throw new Error('Money amount cannot be negative');
      }
      const upper = currency.toUpperCase();
      if (!isValidCurrency(upper)) {
         throw new Error(
            `Unsupported currency code: "${currency}". Supported currencies are: ${Object.values(CurrencyEnum).join(', ')}`,
         );
      }
      this._amount = Math.round(amount * 100) / 100;
      this._currency = upper;
   }

   get amount(): number {
      return this._amount;
   }

   get currency(): CurrencyType {
      return this._currency;
   }

   add(other: Money): Money {
      if (this._currency !== other.currency) {
         throw new Error(`Cannot add money with different currencies: ${this._currency} and ${other.currency}`);
      }
      return new Money(this._amount + other.amount, this._currency);
   }

   equals(other: Money): boolean {
      return this._amount === other.amount && this._currency === other.currency;
   }

   toString(): string {
      return `${this._amount} ${this._currency}`;
   }
}
