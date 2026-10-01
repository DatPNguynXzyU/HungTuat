import { validate } from 'class-validator';
import { RegisterDto } from './register.dto';

describe('RegisterDto', () => {
   it('should validate a correct DTO', async () => {
      const dto = new RegisterDto();
      dto.email = 'valid@example.com';
      dto.password = 'password123';
      dto.confirmPassword = 'password123';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
   });

   it('should fail validation for invalid email', async () => {
      const dto = new RegisterDto();
      dto.email = 'invalid-email';
      dto.password = 'password123';
      dto.confirmPassword = 'password123';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'email')).toBe(true);
   });

   it('should fail validation for short password', async () => {
      const dto = new RegisterDto();
      dto.email = 'valid@example.com';
      dto.password = '123';
      dto.confirmPassword = '123';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'password')).toBe(true);
   });

   it('should fail validation when confirmPassword does not match password', async () => {
      const dto = new RegisterDto();
      dto.email = 'valid@example.com';
      dto.password = 'password123';
      dto.confirmPassword = 'mismatchedPassword';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'confirmPassword')).toBe(true);
   });

   it('should fail validation for missing confirmPassword', async () => {
      const dto = new RegisterDto();
      dto.email = 'valid@example.com';
      dto.password = 'password123';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'confirmPassword')).toBe(true);
   });

   it('should fail validation for too long password', async () => {
      const dto = new RegisterDto();
      dto.email = 'valid@example.com';
      const longPass = 'a'.repeat(101);
      dto.password = longPass;
      dto.confirmPassword = longPass;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'password')).toBe(true);
   });

   it('should accept valid multi-platform optional fields', async () => {
      const dto = new RegisterDto();
      dto.email = 'valid@example.com';
      dto.password = 'password123';
      dto.confirmPassword = 'password123';
      dto.deviceId = 'device-uuid-12345';
      dto.clientType = 'mobile';
      dto.appVersion = '2.1.0';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
   });

   it('should fail validation for invalid clientType enum', async () => {
      const dto = new RegisterDto();
      dto.email = 'valid@example.com';
      dto.password = 'password123';
      dto.confirmPassword = 'password123';
      dto.clientType = 'unknown' as 'web' | 'mobile' | 'desktop';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'clientType')).toBe(true);
   });
});
