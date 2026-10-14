import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateUserProfileDto } from '@contracts/user/dto/user/create-user-profile.dto';
import { GenderDto } from '@contracts/user/dto/user/update-user.dto';

describe('CreateUserProfileDto', () => {
   it('should pass validation with valid data', async () => {
      const dto = plainToInstance(CreateUserProfileDto, {
         displayName: 'John Doe',
         username: 'johndoe',
         gender: GenderDto.MALE,
         dateOfBirth: '1995-05-20',
         bio: 'A short bio',
         location: 'Hanoi',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
   });

   it('should pass validation with only required displayName', async () => {
      const dto = plainToInstance(CreateUserProfileDto, {
         displayName: 'John Doe',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
   });

   it('should fail validation when displayName is missing or empty', async () => {
      const dto = plainToInstance(CreateUserProfileDto, {
         displayName: '',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'displayName')).toBe(true);
   });

   it('should fail validation when username is too short', async () => {
      const dto = plainToInstance(CreateUserProfileDto, {
         displayName: 'John Doe',
         username: 'ab',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'username')).toBe(true);
   });
});
