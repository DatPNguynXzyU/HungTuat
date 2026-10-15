import { Injectable } from '@nestjs/common';
import { Specification } from '@common';
import { USER_ERROR_CODES } from '@contracts/user';
import { FollowStatus } from '@user/entities';

export interface IFollowStatusCandidate {
   status?: FollowStatus | null;
}

/**
 * Domain specification verifying a follow relation is currently in PENDING state.
 */
@Injectable()
export class FollowRequestPendingSpecification extends Specification<IFollowStatusCandidate> {
   protected readonly errorCode = USER_ERROR_CODES.FOLLOW_REQUEST_NOT_PENDING;

   isSatisfiedBy(candidate: IFollowStatusCandidate): boolean {
      if (!candidate || !candidate.status) {
         return false;
      }
      return candidate.status === FollowStatus.PENDING;
   }
}
