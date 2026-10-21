export const CurrencyEnum = {
   VND: 'VND',
   USD: 'USD',
   EUR: 'EUR',
   JPY: 'JPY',
   KRW: 'KRW',
   SGD: 'SGD',
   THB: 'THB',
} as const;

export type CurrencyEnum = (typeof CurrencyEnum)[keyof typeof CurrencyEnum];
export type CurrencyType = CurrencyEnum;

export const DEFAULT_CURRENCY: CurrencyEnum = CurrencyEnum.VND;

export function isValidCurrency(currency: string): currency is CurrencyEnum {
   return Object.values(CurrencyEnum).includes(currency.toUpperCase() as CurrencyEnum);
}
