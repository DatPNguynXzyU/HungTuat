import { Injectable } from '@nestjs/common';
import { Specification } from '@common';
import { AUTH_ERROR_CODES, USER_STATUS } from '@contracts/auth';

export interface IAccountStatusCandidate {
   status?: string | null;
}

/**
 * Domain specification verifying an account is neither BLOCKED nor SUSPENDED.
 */
@Injectable()
export class AccountNotBlockedSpecification extends Specification<IAccountStatusCandidate> {
   protected readonly errorCode = AUTH_ERROR_CODES.ACCOUNT_BLOCKED;

   isSatisfiedBy(candidate: IAccountStatusCandidate): boolean {
      if (!candidate || !candidate.status) {
         return true;
      }
      return candidate.status !== USER_STATUS.BLOCKED && candidate.status !== USER_STATUS.SUSPENDED;
   }
}
