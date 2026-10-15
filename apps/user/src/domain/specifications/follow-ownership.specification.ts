import { Injectable } from '@nestjs/common';
import { Specification } from '@common';
import { USER_ERROR_CODES } from '@contracts/user';

export interface IFollowOwnershipCandidate {
   targetUserId: string;
   followingId: string;
}

/**
 * Domain specification verifying that a user responding to a follow request
 * is indeed the intended recipient of that follow request.
 */
@Injectable()
export class FollowOwnershipSpecification extends Specification<IFollowOwnershipCandidate> {
   protected readonly errorCode = USER_ERROR_CODES.FOLLOW_REQUEST_NOT_FOUND;

   isSatisfiedBy(candidate: IFollowOwnershipCandidate): boolean {
      if (!candidate || !candidate.targetUserId || !candidate.followingId) {
         return false;
      }
      return candidate.targetUserId === candidate.followingId;
   }
}
