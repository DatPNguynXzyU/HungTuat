import { Injectable, Optional } from '@nestjs/common';
import { BadRequestException } from '@common';
import { USER_ERROR_CODES } from '@contracts/user';
import { FOLLOW_OPERATIONS } from '@user/constants';
import { UserResolverService } from '@user/services/infrastructure/user-resolver.service';
import { UserActiveSpecification } from '@user/domain/specifications';
import { AbstractFollowValidationHandler } from '@user/chains/follow-validation/abstract-follow-validation.handler';
import type { FollowValidationContext } from '@user/chains/follow-validation/follow-validation.context';

/**
 * Resolves follower and following users from the underlying data store,
 * verifies their active lifecycle status, and enriches the context.
 */
@Injectable()
export class FollowUserResolutionHandler extends AbstractFollowValidationHandler {
   constructor(
      @Optional()
      private readonly userResolverService?: UserResolverService,
      @Optional()
      private readonly userActiveSpec: UserActiveSpecification = new UserActiveSpecification(),
   ) {
      super();
   }

   override async handle(context: FollowValidationContext): Promise<void> {
      if (context.operation === FOLLOW_OPERATIONS.FOLLOW || context.operation === FOLLOW_OPERATIONS.UNFOLLOW) {
         if (this.userResolverService && context.followerId && context.followingId) {
            const follower = context.follower ?? (await this.userResolverService.resolveUser(context.followerId));
            const following = context.following ?? (await this.userResolverService.resolveUser(context.followingId));

            context.follower = follower;
            context.following = following;

            const followerActiveResult = this.userActiveSpec.validate({
               status: follower.status,
               deletedAt: follower.deletedAt,
            });
            if (followerActiveResult.isFailure()) {
               throw new BadRequestException(USER_ERROR_CODES.USER_NOT_ACTIVE, {
                  params: { userId: follower.userId },
               });
            }

            const followingActiveResult = this.userActiveSpec.validate({
               status: following.status,
               deletedAt: following.deletedAt,
            });
            if (followingActiveResult.isFailure()) {
               throw new BadRequestException(USER_ERROR_CODES.USER_NOT_ACTIVE, {
                  params: { userId: following.userId },
               });
            }
         }
      }

      return super.handle(context);
   }
}
