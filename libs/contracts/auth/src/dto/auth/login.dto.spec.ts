import { validate } from 'class-validator';
import { LoginDto } from '@contracts/auth/dto/auth/login.dto';

describe('LoginDto', () => {
   it('should validate correct login data', async () => {
      const dto = new LoginDto();
      dto.email = 'user@example.com';
      dto.password = 'password123';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
   });

   it('should validate with optional fields', async () => {
      const dto = new LoginDto();
      dto.email = 'user@example.com';
      dto.password = 'password123';
      dto.deviceId = 'device-uuid-12345';
      dto.clientType = 'mobile';
      dto.appVersion = '1.0.0';
      dto.ip = '192.168.1.1';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
   });

   it('should fail validation for invalid email', async () => {
      const dto = new LoginDto();
      dto.email = 'invalid-email';
      dto.password = 'password123';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('email');
   });

   it('should fail validation for empty password', async () => {
      const dto = new LoginDto();
      dto.email = 'user@example.com';
      dto.password = '';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
   });

   it('should fail validation for invalid clientType', async () => {
      const dto = new LoginDto();
      dto.email = 'user@example.com';
      dto.password = 'password123';
      const dtoWithInvalidType = dto as unknown as Record<string, unknown>;
      dtoWithInvalidType.clientType = 'invalid-type';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
   });

   it('should accept valid clientType values', async () => {
      const clientTypes: Array<'web' | 'mobile' | 'desktop'> = ['web', 'mobile', 'desktop'];

      for (const type of clientTypes) {
         const dto = new LoginDto();
         dto.email = 'user@example.com';
         dto.password = 'password123';
         dto.clientType = type;

         const errors = await validate(dto);
         expect(errors.length).toBe(0);
      }
   });
});
