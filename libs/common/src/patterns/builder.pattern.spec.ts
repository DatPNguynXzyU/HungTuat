import type { IBuilder } from '@common/patterns/builder.pattern';

interface Product {
   id: string;
   name: string;
   tags: string[];
}

class ProductBuilder implements IBuilder<Product> {
   private id = '';
   private name = '';
   private tags: string[] = [];

   static create(): ProductBuilder {
      return new ProductBuilder();
   }

   withId(id: string): this {
      this.id = id;
      return this;
   }

   withName(name: string): this {
      this.name = name;
      return this;
   }

   addTag(tag: string): this {
      this.tags.push(tag);
      return this;
   }

   build(): Product {
      if (!this.id) {
         throw new Error('ID is required');
      }
      return {
         id: this.id,
         name: this.name,
         tags: [...this.tags],
      };
   }
}

describe('Builder Pattern', () => {
   it('should construct product step by step and conform to IBuilder', () => {
      const product = ProductBuilder.create().withId('prod-1').withName('Test Product').addTag('security').build();

      expect(product).toEqual({
         id: 'prod-1',
         name: 'Test Product',
         tags: ['security'],
      });
   });

   it('should validate required properties on build()', () => {
      const builder = ProductBuilder.create().withName('Test Product');
      expect(() => builder.build()).toThrow('ID is required');
   });
});
