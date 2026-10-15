import { Injectable } from '@nestjs/common';
import { Specification } from '@common';
import { USER_ERROR_CODES } from '@contracts/user';
import { UserStatus } from '@user/entities';

export interface IUserStatusCandidate {
   status?: UserStatus | null;
   deletedAt?: Date | null;
}

/**
 * Domain specification verifying a user is ACTIVE and not soft-deleted.
 */
@Injectable()
export class UserActiveSpecification extends Specification<IUserStatusCandidate> {
   protected readonly errorCode = USER_ERROR_CODES.USER_NOT_FOUND;

   isSatisfiedBy(candidate: IUserStatusCandidate): boolean {
      if (!candidate) {
         return false;
      }
      if (candidate.deletedAt !== null && candidate.deletedAt !== undefined) {
         return false;
      }
      if (!candidate.status) {
         return true;
      }
      return candidate.status === UserStatus.ACTIVE;
   }
}
