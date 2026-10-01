import { randomInt } from 'crypto';

export class OtpUtil {
   /**
    * Generate a cryptographically secure numeric OTP code of specified length.
    * @param length Number of digits (defaults to 6)
    * @returns String of numeric OTP digits
    */
   static generate(length = 6): string {
      if (length <= 0) {
         throw new Error('OTP length must be greater than 0');
      }
      const min = Math.pow(10, length - 1);
      const max = Math.pow(10, length) - 1;
      return randomInt(min, max + 1).toString();
   }
}
