import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { VerifyRegisterOtpDto } from '@contracts/auth/dto/auth/verify-register-otp.dto';

describe('VerifyRegisterOtpDto', () => {
   it('should pass validation with valid email and 6-digit OTP', async () => {
      const dto = plainToInstance(VerifyRegisterOtpDto, {
         email: 'test@example.com',
         otp: '123456',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
   });

   it('should fail validation when otp is less than 6 digits', async () => {
      const dto = plainToInstance(VerifyRegisterOtpDto, {
         email: 'test@example.com',
         otp: '12345',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'otp')).toBe(true);
   });

   it('should fail validation when otp is more than 6 digits', async () => {
      const dto = plainToInstance(VerifyRegisterOtpDto, {
         email: 'test@example.com',
         otp: '1234567',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'otp')).toBe(true);
   });

   it('should fail validation when email is invalid', async () => {
      const dto = plainToInstance(VerifyRegisterOtpDto, {
         email: 'invalid-email',
         otp: '123456',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'email')).toBe(true);
   });
});
