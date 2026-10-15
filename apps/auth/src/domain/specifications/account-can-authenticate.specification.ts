import { Injectable } from '@nestjs/common';
import { Specification, type ISpecification, type Result } from '@common';
import { AUTH_ERROR_CODES } from '@contracts/auth';
import {
   AccountNotBlockedSpecification,
   type IAccountStatusCandidate,
} from '@auth/domain/specifications/account-not-blocked.specification';
import { AccountActiveSpecification } from '@auth/domain/specifications/account-active.specification';

/**
 * Composite specification combining AccountNotBlockedSpecification and AccountActiveSpecification.
 * Verifies that an account is allowed to log in, rotate tokens, or access authentication resources.
 */
@Injectable()
export class AccountCanAuthenticateSpecification extends Specification<IAccountStatusCandidate> {
   protected readonly errorCode = AUTH_ERROR_CODES.ACCOUNT_BLOCKED;
   private readonly compositeSpec: ISpecification<IAccountStatusCandidate>;

   constructor(
      private readonly notBlockedSpec = new AccountNotBlockedSpecification(),
      private readonly activeSpec = new AccountActiveSpecification(),
   ) {
      super();
      this.compositeSpec = this.notBlockedSpec.and(this.activeSpec);
   }

   isSatisfiedBy(candidate: IAccountStatusCandidate): boolean {
      return this.compositeSpec.isSatisfiedBy(candidate);
   }

   override validate(candidate: IAccountStatusCandidate): Result<void> {
      return this.compositeSpec.validate(candidate);
   }
}
