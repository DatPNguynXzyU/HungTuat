import { USER_ERROR_CODES } from '@contracts/user';
import { Username } from '@user/domain/value-objects/username.vo';

describe('Username Value Object', () => {
   it('should successfully create and normalize valid username', () => {
      const res = Username.create('  John_Doe.123  ');
      expect(res.isSuccess()).toBe(true);
      expect(res.getValue().getValue()).toBe('john_doe.123');
   });

   it('should fail when username is empty or whitespace only', () => {
      const res = Username.create('   ');
      expect(res.isFailure()).toBe(true);
      expect(res.getError()).toBe(USER_ERROR_CODES.INVALID_USERNAME_FORMAT);
   });

   it('should fail when username is shorter than 3 characters', () => {
      const res = Username.create('ab');
      expect(res.isFailure()).toBe(true);
      expect(res.getError()).toBe(USER_ERROR_CODES.INVALID_USERNAME_FORMAT);
      expect(res.getParams()?.min).toBe(3);
   });

   it('should fail when username exceeds 30 characters', () => {
      const longName = 'a'.repeat(31);
      const res = Username.create(longName);
      expect(res.isFailure()).toBe(true);
      expect(res.getError()).toBe(USER_ERROR_CODES.INVALID_USERNAME_FORMAT);
      expect(res.getParams()?.max).toBe(30);
   });

   it('should fail when username contains invalid characters', () => {
      const res = Username.create('john@doe');
      expect(res.isFailure()).toBe(true);
      expect(res.getError()).toBe(USER_ERROR_CODES.INVALID_USERNAME_FORMAT);
   });

   it('should fail when username starts or ends with dot', () => {
      expect(Username.create('.johndoe').isFailure()).toBe(true);
      expect(Username.create('johndoe.').isFailure()).toBe(true);
   });

   it('should fail when username has consecutive dots', () => {
      expect(Username.create('john..doe').isFailure()).toBe(true);
   });

   it('should compare equality correctly', () => {
      const u1 = Username.create('johndoe').getValue();
      const u2 = Username.create('JOHNDOE').getValue();
      const u3 = Username.create('janedoe').getValue();

      expect(u1.equals(u2)).toBe(true);
      expect(u1.equals(u3)).toBe(false);
      expect(u1.equals(null)).toBe(false);
   });
});
