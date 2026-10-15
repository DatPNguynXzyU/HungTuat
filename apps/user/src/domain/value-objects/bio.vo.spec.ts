import { Bio } from '@user/domain/value-objects/bio.vo';

describe('Bio Value Object', () => {
   it('should handle undefined or null bio by returning null value', () => {
      const resNull = Bio.create(null);
      expect(resNull.isSuccess()).toBe(true);
      expect(resNull.getValue().getValue()).toBeNull();

      const resUndefined = Bio.create(undefined);
      expect(resUndefined.isSuccess()).toBe(true);
      expect(resUndefined.getValue().getValue()).toBeNull();
   });

   it('should normalize whitespace and empty strings to null', () => {
      const res = Bio.create('   ');
      expect(res.isSuccess()).toBe(true);
      expect(res.getValue().getValue()).toBeNull();
   });

   it('should preserve valid trimmed bio within 500 characters', () => {
      const text = ' Software engineer building microservices. ';
      const res = Bio.create(text);
      expect(res.isSuccess()).toBe(true);
      expect(res.getValue().getValue()).toBe('Software engineer building microservices.');
   });

   it('should fail when bio exceeds 500 characters', () => {
      const longBio = 'b'.repeat(501);
      const res = Bio.create(longBio);
      expect(res.isFailure()).toBe(true);
      expect(res.getParams()?.max).toBe(500);
   });

   it('should compare equality correctly', () => {
      const b1 = Bio.create('Chef and food lover').getValue();
      const b2 = Bio.create('Chef and food lover').getValue();
      const b3 = Bio.create('Gamer').getValue();

      expect(b1.equals(b2)).toBe(true);
      expect(b1.equals(b3)).toBe(false);
      expect(b1.equals(null)).toBe(false);
   });
});
