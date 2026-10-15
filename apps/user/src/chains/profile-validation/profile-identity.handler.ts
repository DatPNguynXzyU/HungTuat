import { Injectable, Optional } from '@nestjs/common';
import { BadRequestException, ForbiddenException, COMMON_ERROR_CODES } from '@common';
import { USER_ERROR_CODES } from '@contracts/user';
import { PROFILE_OPERATIONS } from '@user/constants';
import { ProfileQueryService } from '@user/services/domain/profile-query.service';
import { UserActiveSpecification } from '@user/domain/specifications';
import { AbstractProfileValidationHandler } from '@user/chains/profile-validation/abstract-profile-validation.handler';
import type { ProfileValidationContext } from '@user/chains/profile-validation/profile-validation.context';

/**
 * Validates identity identifiers, profile ownership, and user activation status.
 * - For CREATE operations: ensures accountId is supplied.
 * - For UPDATE operations: ensures userId is supplied, verifies user existence, active status,
 *   and enforces ownership or admin authorization if actor identity is provided.
 */
@Injectable()
export class ProfileIdentityHandler extends AbstractProfileValidationHandler {
   constructor(
      @Optional()
      private readonly profileQueryService?: ProfileQueryService,
      @Optional()
      private readonly userActiveSpec: UserActiveSpecification = new UserActiveSpecification(),
   ) {
      super();
   }

   override async handle(context: ProfileValidationContext): Promise<void> {
      if (context.operation === PROFILE_OPERATIONS.CREATE) {
         if (!context.accountId) {
            throw new BadRequestException(USER_ERROR_CODES.USER_ID_REQUIRED);
         }
      } else if (context.operation === PROFILE_OPERATIONS.UPDATE) {
         if (!context.userId) {
            throw new BadRequestException(USER_ERROR_CODES.USER_ID_REQUIRED);
         }

         if (this.profileQueryService) {
            const user = await this.profileQueryService.getUserById(context.userId);
            context.existingUser = user;

            const activeResult = this.userActiveSpec.validate({
               status: user.status,
               deletedAt: user.deletedAt,
            });

            if (activeResult.isFailure()) {
               throw new BadRequestException(USER_ERROR_CODES.USER_NOT_ACTIVE, {
                  params: { userId: context.userId },
               });
            }

            if (context.actorAccountId && context.actorAccountId !== user.accountId && !context.isActorAdmin) {
               throw new ForbiddenException(COMMON_ERROR_CODES.FORBIDDEN);
            }
         }
      }

      return super.handle(context);
   }
}
