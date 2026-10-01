import { OtpUtil } from '@common/utils/otp.util';

describe('OtpUtil', () => {
   describe('generate', () => {
      it('should generate a 6-digit numeric string by default', () => {
         const otp = OtpUtil.generate();
         expect(otp).toHaveLength(6);
         expect(otp).toMatch(/^\d{6}$/);
      });

      it('should generate numeric OTP of custom specified length', () => {
         const otp4 = OtpUtil.generate(4);
         expect(otp4).toHaveLength(4);
         expect(otp4).toMatch(/^\d{4}$/);

         const otp8 = OtpUtil.generate(8);
         expect(otp8).toHaveLength(8);
         expect(otp8).toMatch(/^\d{8}$/);
      });

      it('should throw an error for invalid length <= 0', () => {
         expect(() => OtpUtil.generate(0)).toThrow('OTP length must be greater than 0');
         expect(() => OtpUtil.generate(-1)).toThrow('OTP length must be greater than 0');
      });
   });
});
