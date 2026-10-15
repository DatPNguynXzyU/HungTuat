import { Injectable } from '@nestjs/common';
import { Specification } from '@common';
import { AUTH_ERROR_CODES, USER_STATUS } from '@contracts/auth';
import type { IAccountStatusCandidate } from '@auth/domain/specifications/account-not-blocked.specification';

/**
 * Domain specification verifying an account is not in INACTIVE state.
 */
@Injectable()
export class AccountActiveSpecification extends Specification<IAccountStatusCandidate> {
   protected readonly errorCode = AUTH_ERROR_CODES.ACCOUNT_INACTIVE;

   isSatisfiedBy(candidate: IAccountStatusCandidate): boolean {
      if (!candidate || !candidate.status) {
         return true;
      }
      return candidate.status !== USER_STATUS.INACTIVE;
   }
}
