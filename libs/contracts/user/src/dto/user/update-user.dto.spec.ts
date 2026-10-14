import { validate } from 'class-validator';
import { GenderDto, UpdateUserDto } from './update-user.dto';

describe('UpdateUserDto', () => {
   it('should validate valid update fields successfully', async () => {
      const dto = new UpdateUserDto();
      dto.displayName = 'John Doe';
      dto.username = 'johndoe';
      dto.gender = GenderDto.MALE;
      dto.dateOfBirth = '2000-01-15';
      dto.bio = 'Hello world!';
      dto.avatar = 'https://example.com/avatar.png';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
   });

   it('should fail validation when username is too short', async () => {
      const dto = new UpdateUserDto();
      dto.username = 'ab';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'username')).toBe(true);
   });

   it('should fail validation when displayName is too short', async () => {
      const dto = new UpdateUserDto();
      dto.displayName = 'a';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'displayName')).toBe(true);
   });

   it('should fail validation for invalid gender enum', async () => {
      const dto = new UpdateUserDto();
      dto.gender = 'INVALID_GENDER' as GenderDto;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'gender')).toBe(true);
   });

   it('should fail validation for invalid date string', async () => {
      const dto = new UpdateUserDto();
      dto.dateOfBirth = 'invalid-date';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'dateOfBirth')).toBe(true);
   });
});
