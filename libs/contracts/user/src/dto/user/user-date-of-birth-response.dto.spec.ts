import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UserDateOfBirthResponseDto } from '@contracts/user/dto/user/user-date-of-birth-response.dto';

describe('UserDateOfBirthResponseDto', () => {
   it('should validate valid date of birth data', async () => {
      const plain = {
         userId: '018dc3bc-11a2-7f28-9842-bc08684d0001',
         dateOfBirth: '1995-06-15T00:00:00.000Z',
         age: 30,
      };

      const dto = plainToInstance(UserDateOfBirthResponseDto, plain);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
   });

   it('should validate when dateOfBirth is null and age is null', async () => {
      const plain = {
         userId: '018dc3bc-11a2-7f28-9842-bc08684d0001',
         dateOfBirth: null,
         age: null,
      };

      const dto = plainToInstance(UserDateOfBirthResponseDto, plain);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
   });

   it('should fail when userId is not a valid uuid', async () => {
      const plain = {
         userId: 'invalid-uuid',
         dateOfBirth: '1995-06-15T00:00:00.000Z',
         age: 30,
      };

      const dto = plainToInstance(UserDateOfBirthResponseDto, plain);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('userId');
   });
});
