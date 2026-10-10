import { validate } from 'class-validator';
import { RefreshTokenDto } from './refresh-token.dto';

describe('RefreshTokenDto', () => {
   it('should validate with refreshToken', async () => {
      const dto = new RefreshTokenDto();
      dto.refreshToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
   });

   it('should validate with deviceId', async () => {
      const dto = new RefreshTokenDto();
      dto.deviceId = 'device-uuid-12345';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
   });

   it('should validate with both refreshToken and deviceId', async () => {
      const dto = new RefreshTokenDto();
      dto.refreshToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature';
      dto.deviceId = 'device-uuid-12345';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
   });

   it('should validate with empty DTO (both fields optional)', async () => {
      const dto = new RefreshTokenDto();

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
   });

   it('should fail validation for non-string refreshToken', async () => {
      const dto = new RefreshTokenDto();
      const dtoWithInvalidType = dto as Record<string, unknown>;
      dtoWithInvalidType.refreshToken = 12345;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'refreshToken')).toBe(true);
   });

   it('should fail validation for non-string deviceId', async () => {
      const dto = new RefreshTokenDto();
      const dtoWithInvalidType = dto as Record<string, unknown>;
      dtoWithInvalidType.deviceId = 12345;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'deviceId')).toBe(true);
   });
});
