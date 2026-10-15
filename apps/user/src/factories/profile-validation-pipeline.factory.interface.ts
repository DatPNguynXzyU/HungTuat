import type { IChainHandler } from '@common';
import type { ProfileValidationContext } from '@user/chains/profile-validation/profile-validation.context';
import type { ProfileValidationPipeline } from '@user/chains/profile-validation/profile-validation.pipeline';
import type { ProfileIdentityHandler } from '@user/chains/profile-validation/profile-identity.handler';
import type { UsernameFormatHandler } from '@user/chains/profile-validation/username-format.handler';
import type { ProfileDetailsFormatHandler } from '@user/chains/profile-validation/profile-details-format.handler';
import type { UsernameAvailabilityHandler } from '@user/chains/profile-validation/username-availability.handler';

export interface IProfileValidationPipelineFactory {
   createPipeline(customHandlers?: IChainHandler<ProfileValidationContext, void>[]): ProfileValidationPipeline;
   createIdentityHandler(): ProfileIdentityHandler;
   createUsernameFormatHandler(): UsernameFormatHandler;
   createDetailsFormatHandler(): ProfileDetailsFormatHandler;
   createUsernameAvailabilityHandler(): UsernameAvailabilityHandler;
}
