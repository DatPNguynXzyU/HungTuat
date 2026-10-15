import { Injectable } from '@nestjs/common';
import { Specification } from '@common';
import { USER_ERROR_CODES } from '@contracts/user';

export interface IFollowSelfCandidate {
   followerId: string;
   followingId: string;
}

/**
 * Domain specification verifying a user is not attempting to follow themselves.
 */
@Injectable()
export class CannotFollowSelfSpecification extends Specification<IFollowSelfCandidate> {
   protected readonly errorCode = USER_ERROR_CODES.CANNOT_FOLLOW_YOURSELF;

   isSatisfiedBy(candidate: IFollowSelfCandidate): boolean {
      if (!candidate || !candidate.followerId || !candidate.followingId) {
         return false;
      }
      return candidate.followerId !== candidate.followingId;
   }
}
