export class Sku {
   private readonly _value: string;

   constructor(value: string) {
      const trimmed = value.trim().toUpperCase();
      if (!trimmed || trimmed.length < 3) {
         throw new Error('SKU must be at least 3 characters long');
      }
      this._value = trimmed;
   }

   get value(): string {
      return this._value;
   }

   equals(other: Sku): boolean {
      return this._value === other.value;
   }

   toString(): string {
      return this._value;
   }
}
