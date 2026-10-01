import { validate } from 'class-validator';
import { Match } from './match.decorator';

class TestMatchDto {
   password!: string;

   @Match('password', { message: 'Passwords do not match' })
   confirmPassword!: string;
}

describe('Match Decorator', () => {
   it('should pass validation when values match', async () => {
      const dto = new TestMatchDto();
      dto.password = 'secret123';
      dto.confirmPassword = 'secret123';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
   });

   it('should fail validation when values do not match', async () => {
      const dto = new TestMatchDto();
      dto.password = 'secret123';
      dto.confirmPassword = 'differentPassword';

      const errors = await validate(dto);
      expect(errors.length).toBe(1);
      expect(errors[0].constraints?.isMatch).toBe('Passwords do not match');
   });
});
