import { Injectable } from '@nestjs/common';
import { Specification } from '@common';
import { AUTH_ERROR_CODES } from '@contracts/auth';

export interface IPasswordChangeCandidate {
   currentPassword: string;
   newPassword: string;
}

/**
 * Domain specification verifying that the new password is intentionally different from current password.
 */
@Injectable()
export class PasswordMustChangeSpecification extends Specification<IPasswordChangeCandidate> {
   protected readonly errorCode = AUTH_ERROR_CODES.PASSWORD_UNCHANGED;

   isSatisfiedBy(candidate: IPasswordChangeCandidate): boolean {
      if (!candidate) {
         return false;
      }
      return candidate.currentPassword !== candidate.newPassword;
   }
}
