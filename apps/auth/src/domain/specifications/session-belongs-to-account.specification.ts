import { Injectable } from '@nestjs/common';
import { Specification } from '@common';
import { AUTH_ERROR_CODES } from '@contracts/auth';

export interface ISessionOwnershipCandidate {
   session?: { accountId: string } | null;
   accountId: string;
}

/**
 * Domain specification verifying that a session exists and belongs to the requested account.
 */
@Injectable()
export class SessionBelongsToAccountSpecification extends Specification<ISessionOwnershipCandidate> {
   protected readonly errorCode = AUTH_ERROR_CODES.SESSION_NOT_FOUND;

   isSatisfiedBy(candidate: ISessionOwnershipCandidate): boolean {
      if (!candidate || !candidate.session || !candidate.accountId) {
         return false;
      }
      return candidate.session.accountId === candidate.accountId;
   }
}
