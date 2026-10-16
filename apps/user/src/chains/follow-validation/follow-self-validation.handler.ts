import { Injectable, Optional } from '@nestjs/common';
import { BadRequestException } from '@common';
import { USER_ERROR_CODES } from '@contracts/user';
import { FOLLOW_OPERATIONS } from '@user/constants';
import { CannotFollowSelfSpecification } from '@user/domain/specifications';
import { AbstractFollowValidationHandler } from '@user/chains/follow-validation/abstract-follow-validation.handler';
import type { FollowValidationContext } from '@user/chains/follow-validation/follow-validation.context';
import {
   resolveMissingFollowTargetField,
   createMissingFieldParams,
   createFollowPairParams,
} from '@user/chains/follow-validation/follow-validation.helper';

/**
 * Validates self-follow constraints and basic identifier requirements for follow operations.
 * Enforces the invariant: a user cannot follow or unfollow themselves.
 */
@Injectable()
export class FollowSelfValidationHandler extends AbstractFollowValidationHandler {
   constructor(
      @Optional()
      private readonly cannotFollowSelfSpec: CannotFollowSelfSpecification = new CannotFollowSelfSpecification(),
   ) {
      super();
   }

   override async handle(context: FollowValidationContext): Promise<void> {
      if (context.operation === FOLLOW_OPERATIONS.FOLLOW || context.operation === FOLLOW_OPERATIONS.UNFOLLOW) {
         const missingField = resolveMissingFollowTargetField(context);
         if (missingField) {
            throw new BadRequestException(USER_ERROR_CODES.USER_ID_REQUIRED, {
               params: createMissingFieldParams(missingField),
            });
         }

         const selfSpecResult = this.cannotFollowSelfSpec.validate({
            followerId: context.followerId!,
            followingId: context.followingId!,
         });

         if (selfSpecResult.isFailure()) {
            throw new BadRequestException(selfSpecResult.getError(), {
               params: selfSpecResult.getParams() ?? createFollowPairParams(context.followerId!, context.followingId!),
            });
         }
      }

      return super.handle(context);
   }
}
