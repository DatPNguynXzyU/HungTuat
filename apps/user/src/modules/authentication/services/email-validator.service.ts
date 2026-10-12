import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailValidatorService {
   private readonly emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

   isValid(email: string): boolean {
      if (!email) {
         return false;
      }
      return this.emailRegex.test(email.trim());
   }

   extractBaseUsername(email: string): string {
      if (!this.isValid(email)) {
         return '';
      }
      return email.split('@')[0].trim().toLowerCase();
   }
}
