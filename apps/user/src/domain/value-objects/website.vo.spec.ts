import { Website } from '@user/domain/value-objects/website.vo';

describe('Website Value Object', () => {
   it('should handle undefined or null website by returning null value', () => {
      expect(Website.create(null).getValue().getValue()).toBeNull();
      expect(Website.create(undefined).getValue().getValue()).toBeNull();
      expect(Website.create('   ').getValue().getValue()).toBeNull();
   });

   it('should successfully parse valid http and https URLs', () => {
      const resHttps = Website.create('https://example.com/profile');
      expect(resHttps.isSuccess()).toBe(true);
      expect(resHttps.getValue().getValue()).toBe('https://example.com/profile');

      const resHttp = Website.create('http://my-blog.org');
      expect(resHttp.isSuccess()).toBe(true);
      expect(resHttp.getValue().getValue()).toBe('http://my-blog.org');
   });

   it('should fail for invalid URLs or unsupported protocols', () => {
      expect(Website.create('not-a-valid-url').isFailure()).toBe(true);
      expect(Website.create('ftp://example.com/file').isFailure()).toBe(true);
      expect(Website.create('javascript:alert(1)').isFailure()).toBe(true);
   });

   it('should fail when URL exceeds 2048 characters', () => {
      const longUrl = `https://example.com/${'a'.repeat(2050)}`;
      const res = Website.create(longUrl);
      expect(res.isFailure()).toBe(true);
      expect(res.getParams()?.max).toBe(2048);
   });

   it('should compare equality correctly', () => {
      const w1 = Website.create('https://github.com/omni').getValue();
      const w2 = Website.create('https://github.com/omni').getValue();
      const w3 = Website.create('https://github.com/other').getValue();

      expect(w1.equals(w2)).toBe(true);
      expect(w1.equals(w3)).toBe(false);
      expect(w1.equals(null)).toBe(false);
   });
});
