import { forwardRef, Inject, Injectable } from '@nestjs/common';
import type { IChainHandler } from '@common';
import {
   ProfileValidationPipeline,
   ProfileIdentityHandler,
   UsernameFormatHandler,
   ProfileDetailsFormatHandler,
   UsernameAvailabilityHandler,
   type ProfileValidationContext,
} from '@user/chains/profile-validation';
import { ProfileQueryService } from '@user/services/domain/profile-query.service';
import { UsernameBloomFilterService } from '@user/services/infrastructure/username-bloom-filter.service';
import { USER_PROFILE_REPOSITORY, type IUserProfileRepository } from '@user/modules/profile/repositories';
import type { IProfileValidationPipelineFactory } from '@user/factories/profile-validation-pipeline.factory.interface';

/**
 * Factory responsible for assembling the profile validation Chain of Responsibility pipeline.
 * Encapsulates the instantiation and ordered chaining of validation handlers.
 */
@Injectable()
export class ProfileValidationPipelineFactory implements IProfileValidationPipelineFactory {
   constructor(
      @Inject(forwardRef(() => ProfileQueryService))
      private readonly profileQueryService: ProfileQueryService,
      private readonly usernameBloomFilterService: UsernameBloomFilterService,
      @Inject(USER_PROFILE_REPOSITORY)
      private readonly userProfileRepository: IUserProfileRepository,
   ) {}

   createIdentityHandler(): ProfileIdentityHandler {
      return new ProfileIdentityHandler(this.profileQueryService);
   }

   createUsernameFormatHandler(): UsernameFormatHandler {
      return new UsernameFormatHandler();
   }

   createDetailsFormatHandler(): ProfileDetailsFormatHandler {
      return new ProfileDetailsFormatHandler();
   }

   createUsernameAvailabilityHandler(): UsernameAvailabilityHandler {
      return new UsernameAvailabilityHandler(this.usernameBloomFilterService, this.userProfileRepository);
   }

   createPipeline(customHandlers?: IChainHandler<ProfileValidationContext, void>[]): ProfileValidationPipeline {
      if (customHandlers && customHandlers.length > 0) {
         return new ProfileValidationPipeline(customHandlers);
      }

      const handlers: IChainHandler<ProfileValidationContext, void>[] = [
         this.createIdentityHandler(),
         this.createUsernameFormatHandler(),
         this.createDetailsFormatHandler(),
         this.createUsernameAvailabilityHandler(),
      ];

      return new ProfileValidationPipeline(handlers);
   }
}
