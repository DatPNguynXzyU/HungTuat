import { Inject, Injectable, Optional } from '@nestjs/common';
import { Specification, Result } from '@common';
import { USER_ERROR_CODES } from '@contracts/user';
import { UserStatus } from '@user/entities';
import { CannotFollowSelfSpecification } from '@user/domain/specifications/cannot-follow-self.specification';
import { UserActiveSpecification } from '@user/domain/specifications/user-active.specification';
import { USER_SPECIFICATION_FACTORY } from '@user/constants';
import { UserSpecificationFactory, type IUserSpecificationFactory } from '@user/factories';

export interface IUserCanFollowCandidate {
   followerId: string;
   followingId: string;
   followerStatus?: UserStatus | null;
   followerDeletedAt?: Date | null;
   followingStatus?: UserStatus | null;
   followingDeletedAt?: Date | null;
}

/**
 * Composite domain specification validating prerequisites for establishing a follow relationship.
 * Invariants:
 * 1. User cannot follow themselves.
 * 2. Follower must be an active, non-deleted user.
 * 3. Following user must be an active, non-deleted user.
 */
@Injectable()
export class UserCanFollowSpecification extends Specification<IUserCanFollowCandidate> {
   protected readonly errorCode = USER_ERROR_CODES.CANNOT_FOLLOW_YOURSELF;
   private readonly cannotFollowSelfSpec: CannotFollowSelfSpecification;
   private readonly userActiveSpec: UserActiveSpecification;

   constructor(
      cannotFollowSelfSpec?: CannotFollowSelfSpecification,
      userActiveSpec?: UserActiveSpecification,
      @Optional()
      @Inject(USER_SPECIFICATION_FACTORY)
      specificationFactory?: IUserSpecificationFactory,
   ) {
      super();
      const factory = specificationFactory ?? new UserSpecificationFactory();
      this.cannotFollowSelfSpec = cannotFollowSelfSpec ?? factory.createCannotFollowSelfSpecification();
      this.userActiveSpec = userActiveSpec ?? factory.createUserActiveSpecification();
   }

   isSatisfiedBy(candidate: IUserCanFollowCandidate): boolean {
      if (!candidate) {
         return false;
      }

      const notSelf = this.cannotFollowSelfSpec.isSatisfiedBy({
         followerId: candidate.followerId,
         followingId: candidate.followingId,
      });

      if (!notSelf) {
         return false;
      }

      const followerActive = this.userActiveSpec.isSatisfiedBy({
         status: candidate.followerStatus,
         deletedAt: candidate.followerDeletedAt,
      });

      if (!followerActive) {
         return false;
      }

      const followingActive = this.userActiveSpec.isSatisfiedBy({
         status: candidate.followingStatus,
         deletedAt: candidate.followingDeletedAt,
      });

      return followingActive;
   }

   override validate(candidate: IUserCanFollowCandidate): Result<void> {
      if (!candidate) {
         return Result.fail(this.errorCode);
      }

      const notSelfResult = this.cannotFollowSelfSpec.validate({
         followerId: candidate.followerId,
         followingId: candidate.followingId,
      });
      if (notSelfResult.isFailure()) {
         return notSelfResult;
      }

      const followerResult = this.userActiveSpec.validate({
         status: candidate.followerStatus,
         deletedAt: candidate.followerDeletedAt,
      });
      if (followerResult.isFailure()) {
         return followerResult;
      }

      const followingResult = this.userActiveSpec.validate({
         status: candidate.followingStatus,
         deletedAt: candidate.followingDeletedAt,
      });
      if (followingResult.isFailure()) {
         return followingResult;
      }

      return Result.ok(undefined);
   }
}
