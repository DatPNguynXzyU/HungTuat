import { Injectable, Optional } from '@nestjs/common';
import { BadRequestException } from '@common';
import { USER_ERROR_CODES, USER_ERROR_REASONS } from '@contracts/user';
import { UsernameChangeCooldownSpecification } from '@user/domain/specifications';
import { AbstractProfileValidationHandler } from '@user/chains/profile-validation/abstract-profile-validation.handler';
import type { ProfileValidationContext } from '@user/chains/profile-validation/profile-validation.context';

/**
 * Validates username change eligibility against the 30-day cooldown policy.
 * Bypasses check if the username is unchanged, if the user never had a username,
 * or if the acting caller possesses administrative privileges.
 */
@Injectable()
export class UsernameCooldownHandler extends AbstractProfileValidationHandler {
   constructor(
      @Optional()
      private readonly cooldownSpec: UsernameChangeCooldownSpecification = new UsernameChangeCooldownSpecification(),
   ) {
      super();
   }

   override async handle(context: ProfileValidationContext): Promise<void> {
      if (context.username !== undefined && context.username !== null && context.username !== '') {
         const existingUser = context.existingUser;
         if (existingUser) {
            const isSatisfied = this.cooldownSpec.isSatisfiedBy({
               currentUsername: existingUser.username,
               newUsername: context.username,
               lastUsernameChangedAt: existingUser.lastUsernameChangedAt,
               isActorAdmin: context.isActorAdmin,
            });

            if (!isSatisfied && existingUser.lastUsernameChangedAt) {
               const details = this.cooldownSpec.getCooldownDetails(existingUser.lastUsernameChangedAt);
               throw new BadRequestException(USER_ERROR_CODES.USERNAME_CHANGE_COOLDOWN, {
                  params: {
                     daysRemaining: details.daysRemaining,
                     hoursRemaining: details.hoursRemaining,
                     nextAvailableDate: details.nextAvailableDate.toISOString(),
                     reason: USER_ERROR_REASONS.COOLDOWN_ACTIVE,
                  },
               });
            }
         }
      }

      return super.handle(context);
   }
}
