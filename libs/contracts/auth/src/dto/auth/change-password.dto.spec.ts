import { validate } from 'class-validator';
import { ChangePasswordDto } from './change-password.dto';

describe('ChangePasswordDto', () => {
   it('should validate a correct DTO', async () => {
      const dto = new ChangePasswordDto();
      dto.currentPassword = 'oldPassword123';
      dto.newPassword = 'newPassword123';
      dto.confirmPassword = 'newPassword123';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
   });

   it('should fail validation when currentPassword is empty', async () => {
      const dto = new ChangePasswordDto();
      dto.currentPassword = '';
      dto.newPassword = 'newPassword123';
      dto.confirmPassword = 'newPassword123';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'currentPassword')).toBe(true);
   });

   it('should fail validation for short newPassword', async () => {
      const dto = new ChangePasswordDto();
      dto.currentPassword = 'oldPassword123';
      dto.newPassword = '123';
      dto.confirmPassword = '123';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'newPassword')).toBe(true);
   });

   it('should fail validation for too long newPassword', async () => {
      const dto = new ChangePasswordDto();
      dto.currentPassword = 'oldPassword123';
      const longPass = 'a'.repeat(101);
      dto.newPassword = longPass;
      dto.confirmPassword = longPass;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'newPassword')).toBe(true);
   });

   it('should fail validation when confirmPassword does not match newPassword', async () => {
      const dto = new ChangePasswordDto();
      dto.currentPassword = 'oldPassword123';
      dto.newPassword = 'newPassword123';
      dto.confirmPassword = 'mismatchedPassword';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'confirmPassword')).toBe(true);
   });

   it('should fail validation for missing confirmPassword', async () => {
      const dto = new ChangePasswordDto();
      dto.currentPassword = 'oldPassword123';
      dto.newPassword = 'newPassword123';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'confirmPassword')).toBe(true);
   });

   it('should validate when logoutAll is provided as boolean', async () => {
      const dto = new ChangePasswordDto();
      dto.currentPassword = 'oldPassword123';
      dto.newPassword = 'newPassword123';
      dto.confirmPassword = 'newPassword123';
      dto.logoutAll = true;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
   });

   it('should fail validation when logoutAll is not a boolean', async () => {
      const dto = new ChangePasswordDto();
      dto.currentPassword = 'oldPassword123';
      dto.newPassword = 'newPassword123';
      dto.confirmPassword = 'newPassword123';
      (dto as unknown as { logoutAll: unknown }).logoutAll = 'invalid-boolean';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'logoutAll')).toBe(true);
   });
});
