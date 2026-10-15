import { DisplayName } from '@user/domain/value-objects/display-name.vo';

describe('DisplayName Value Object', () => {
   it('should successfully create trimmed display name', () => {
      const res = DisplayName.create('  John Doe  ');
      expect(res.isSuccess()).toBe(true);
      expect(res.getValue().getValue()).toBe('John Doe');
   });

   it('should fail when display name is empty', () => {
      const res = DisplayName.create('   ');
      expect(res.isFailure()).toBe(true);
   });

   it('should fail when display name is less than 2 characters', () => {
      const res = DisplayName.create('A');
      expect(res.isFailure()).toBe(true);
      expect(res.getParams()?.min).toBe(2);
   });

   it('should fail when display name exceeds 50 characters', () => {
      const res = DisplayName.create('A'.repeat(51));
      expect(res.isFailure()).toBe(true);
      expect(res.getParams()?.max).toBe(50);
   });

   it('should compare equality correctly', () => {
      const d1 = DisplayName.create('John Doe').getValue();
      const d2 = DisplayName.create('John Doe').getValue();
      const d3 = DisplayName.create('Jane Doe').getValue();

      expect(d1.equals(d2)).toBe(true);
      expect(d1.equals(d3)).toBe(false);
      expect(d1.equals(null)).toBe(false);
   });
});
