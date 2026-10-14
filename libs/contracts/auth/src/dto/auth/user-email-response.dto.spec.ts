import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UserEmailResponseDto } from './user-email-response.dto';

describe('UserEmailResponseDto', () => {
   it('should validate valid email response data', async () => {
      const plain = {
         id: '018dc3bc-11a2-7f28-9842-bc08684d0001',
         email: 'test@example.com',
         isEmailVerified: true,
      };

      const dto = plainToInstance(UserEmailResponseDto, plain);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
   });

   it('should fail when id is not a valid uuid', async () => {
      const plain = {
         id: 'not-a-uuid',
         email: 'test@example.com',
         isEmailVerified: true,
      };

      const dto = plainToInstance(UserEmailResponseDto, plain);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('id');
   });

   it('should fail when email is invalid', async () => {
      const plain = {
         id: '018dc3bc-11a2-7f28-9842-bc08684d0001',
         email: 'invalid-email',
         isEmailVerified: false,
      };

      const dto = plainToInstance(UserEmailResponseDto, plain);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('email');
   });
});
