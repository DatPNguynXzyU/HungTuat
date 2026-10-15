import { Injectable, Optional } from '@nestjs/common';
import { Chain, type IChainHandler } from '@common';
import type { ProfileValidationContext } from '@user/chains/profile-validation/profile-validation.context';
import { ProfileIdentityHandler } from '@user/chains/profile-validation/profile-identity.handler';
import { UsernameFormatHandler } from '@user/chains/profile-validation/username-format.handler';
import { ProfileDetailsFormatHandler } from '@user/chains/profile-validation/profile-details-format.handler';
import { UsernameAvailabilityHandler } from '@user/chains/profile-validation/username-availability.handler';

/**
 * Pipeline coordinating the profile validation Chain of Responsibility.
 * Executes steps sequentially:
 * 1. Profile Identity, Ownership & Activation Check
 * 2. Username Syntax & Domain Invariants Validation
 * 3. Profile Content Format Validation (DisplayName, DoB, Bio, Website)
 * 4. Username Availability & Uniqueness Check (Bloom Filter + DB)
 */
@Injectable()
export class ProfileValidationPipeline extends Chain<ProfileValidationContext, void> {
   constructor(
      @Optional()
      handlersOrIdentity?: IChainHandler<ProfileValidationContext, void>[] | ProfileIdentityHandler,
      @Optional()
      usernameFormatHandler?: UsernameFormatHandler,
      @Optional()
      detailsFormatHandler?: ProfileDetailsFormatHandler,
      @Optional()
      usernameAvailabilityHandler?: UsernameAvailabilityHandler,
   ) {
      if (Array.isArray(handlersOrIdentity)) {
         super(handlersOrIdentity);
      } else {
         const handlers = [
            handlersOrIdentity,
            usernameFormatHandler,
            detailsFormatHandler,
            usernameAvailabilityHandler,
         ].filter((h): h is NonNullable<typeof h> => Boolean(h));
         super(handlers);
      }
   }

   /**
    * Executes the sequential validation chain on the given profile context.
    */
   async validate(context: ProfileValidationContext): Promise<void> {
      await this.execute(context);
   }
}
