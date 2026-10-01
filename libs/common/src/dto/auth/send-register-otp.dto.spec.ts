import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { SendRegisterOtpDto } from '@common/dto/auth/send-register-otp.dto';

describe('SendRegisterOtpDto', () => {
   it('should pass validation with valid email', async () => {
      const dto = plainToInstance(SendRegisterOtpDto, {
         email: 'test@example.com',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
   });

   it('should fail validation when email is invalid', async () => {
      const dto = plainToInstance(SendRegisterOtpDto, {
         email: 'invalid-email',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('email');
   });

   it('should fail validation when email is empty', async () => {
      const dto = plainToInstance(SendRegisterOtpDto, {
         email: '',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('email');
   });
});
