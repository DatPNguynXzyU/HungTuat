import { Inject, Injectable, Optional } from '@nestjs/common';
import { BadRequestException, NotFoundException } from '@common';
import { USER_ERROR_CODES } from '@contracts/user';
import { FOLLOW_FIELDS, FOLLOW_OPERATIONS } from '@user/constants';
import { FollowStatus } from '@user/entities';
import { FOLLOW_REPOSITORY, type IFollowRepository } from '@user/repositories/follow.repository.interface';
import { FollowRequestPendingSpecification } from '@user/domain/specifications';
import { AbstractFollowValidationHandler } from '@user/chains/follow-validation/abstract-follow-validation.handler';
import type { FollowValidationContext } from '@user/chains/follow-validation/follow-validation.context';
import {
   createFollowIdParams,
   createMissingFieldParams,
} from '@user/chains/follow-validation/follow-validation.helper';

/**
 * Validates follow request operations (accept/reject), verifying existence and pending state invariants.
 */
@Injectable()
export class FollowRequestStatusHandler extends AbstractFollowValidationHandler {
   constructor(
      @Optional()
      @Inject(FOLLOW_REPOSITORY)
      private readonly followRepository?: IFollowRepository,
      @Optional()
      private readonly followRequestPendingSpec: FollowRequestPendingSpecification = new FollowRequestPendingSpecification(),
   ) {
      super();
   }

   override async handle(context: FollowValidationContext): Promise<void> {
      if (
         context.operation === FOLLOW_OPERATIONS.ACCEPT_REQUEST ||
         context.operation === FOLLOW_OPERATIONS.REJECT_REQUEST
      ) {
         if (!context.followId) {
            throw new BadRequestException(USER_ERROR_CODES.USER_ID_REQUIRED, {
               params: createMissingFieldParams(FOLLOW_FIELDS.FOLLOW_ID),
            });
         }

         let follow = context.follow;
         if (!follow && this.followRepository) {
            const found = await this.followRepository.findById(context.followId);
            if (!found) {
               throw new NotFoundException(USER_ERROR_CODES.FOLLOW_NOT_FOUND, {
                  params: createFollowIdParams(context.followId),
               });
            }
            follow = found;
            context.follow = follow;
         }

         if (context.operation === FOLLOW_OPERATIONS.ACCEPT_REQUEST && follow) {
            if (follow.status === FollowStatus.ACCEPTED) {
               throw new BadRequestException(USER_ERROR_CODES.ALREADY_FOLLOWING, {
                  params: createFollowIdParams(context.followId),
               });
            }

            const pendingResult = this.followRequestPendingSpec.validate({ status: follow.status });
            if (pendingResult.isFailure()) {
               throw new BadRequestException(pendingResult.getError(), {
                  params: pendingResult.getParams(),
               });
            }
         }
      }

      return super.handle(context);
   }
}
