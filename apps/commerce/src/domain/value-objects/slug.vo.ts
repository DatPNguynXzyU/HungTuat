export class Slug {
   private readonly _value: string;

   constructor(rawText: string) {
      this._value = Slug.createSlug(rawText);
   }

   get value(): string {
      return this._value;
   }

   static createSlug(text: string): string {
      return text
         .toLowerCase()
         .normalize('NFD')
         .replace(/[\u0300-\u036f]/g, '')
         .replace(/[đĐ]/g, 'd')
         .replace(/[^a-z0-9\s-]/g, '')
         .trim()
         .replace(/\s+/g, '-')
         .replace(/-+/g, '-');
   }

   equals(other: Slug): boolean {
      return this._value === other.value;
   }

   toString(): string {
      return this._value;
   }
}
