import { Inject, Injectable, Optional } from '@nestjs/common';
import { ConflictException } from '@common';
import { USER_ERROR_CODES } from '@contracts/user';
import { PROFILE_OPERATIONS } from '@user/constants';
import {
   USER_PROFILE_REPOSITORY,
   type IUserProfileRepository,
} from '@user/modules/profile/repositories/user-profile.repository.interface';
import { UsernameBloomFilterService } from '@user/services/infrastructure/username-bloom-filter.service';
import { AbstractProfileValidationHandler } from '@user/chains/profile-validation/abstract-profile-validation.handler';
import type { ProfileValidationContext } from '@user/chains/profile-validation/profile-validation.context';

/**
 * Validates username uniqueness across the system using the probabilistic
 * Bloom filter layer backed by persistent database verification.
 */
@Injectable()
export class UsernameAvailabilityHandler extends AbstractProfileValidationHandler {
   constructor(
      @Optional()
      private readonly usernameBloomFilterService?: UsernameBloomFilterService,
      @Optional()
      @Inject(USER_PROFILE_REPOSITORY)
      private readonly userProfileRepository?: IUserProfileRepository,
   ) {
      super();
   }

   override async handle(context: ProfileValidationContext): Promise<void> {
      const username = context.normalizedUsername ?? (context.username ? context.username.toLowerCase().trim() : null);

      if (!username) {
         return super.handle(context);
      }

      // If updating and retaining the exact existing username, bypass uniqueness verification
      if (
         context.operation === PROFILE_OPERATIONS.UPDATE &&
         context.existingUser?.username?.toLowerCase().trim() === username
      ) {
         return super.handle(context);
      }

      if (this.usernameBloomFilterService && this.userProfileRepository) {
         const mightExist = await this.usernameBloomFilterService.mightContain(username);
         if (mightExist) {
            const existingUser = await this.userProfileRepository.findByUsername(username);
            if (
               existingUser &&
               (context.operation !== PROFILE_OPERATIONS.UPDATE || existingUser.userId !== context.userId)
            ) {
               throw new ConflictException(USER_ERROR_CODES.USERNAME_ALREADY_TAKEN, {
                  params: { username: context.username },
               });
            }
         }
      }

      return super.handle(context);
   }
}
