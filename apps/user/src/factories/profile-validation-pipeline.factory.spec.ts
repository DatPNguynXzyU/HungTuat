import { Test, type TestingModule } from '@nestjs/testing';
import {
   ProfileValidationPipeline,
   ProfileIdentityHandler,
   UsernameFormatHandler,
   ProfileDetailsFormatHandler,
   UsernameAvailabilityHandler,
} from '@user/chains/profile-validation';
import { ProfileQueryService } from '@user/services/domain/profile-query.service';
import { UsernameBloomFilterService } from '@user/services/infrastructure/username-bloom-filter.service';
import { USER_PROFILE_REPOSITORY } from '@user/modules/profile/repositories';
import { ProfileValidationPipelineFactory } from '@user/factories/profile-validation-pipeline.factory';

describe('ProfileValidationPipelineFactory', () => {
   let factory: ProfileValidationPipelineFactory;

   const mockProfileQueryService = {
      getUserById: jest.fn(),
   };

   const mockUsernameBloomFilterService = {
      mightContain: jest.fn(),
      addUsername: jest.fn(),
   };

   const mockUserProfileRepository = {
      findByUsername: jest.fn(),
   };

   beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
         providers: [
            ProfileValidationPipelineFactory,
            { provide: ProfileQueryService, useValue: mockProfileQueryService },
            { provide: UsernameBloomFilterService, useValue: mockUsernameBloomFilterService },
            { provide: USER_PROFILE_REPOSITORY, useValue: mockUserProfileRepository },
         ],
      }).compile();

      factory = module.get<ProfileValidationPipelineFactory>(ProfileValidationPipelineFactory);
   });

   it('should be defined', () => {
      expect(factory).toBeDefined();
   });

   it('should create individual handlers', () => {
      expect(factory.createIdentityHandler()).toBeInstanceOf(ProfileIdentityHandler);
      expect(factory.createUsernameFormatHandler()).toBeInstanceOf(UsernameFormatHandler);
      expect(factory.createDetailsFormatHandler()).toBeInstanceOf(ProfileDetailsFormatHandler);
      expect(factory.createUsernameAvailabilityHandler()).toBeInstanceOf(UsernameAvailabilityHandler);
   });

   it('should create default ProfileValidationPipeline with all 4 handlers', () => {
      const pipeline = factory.createPipeline();
      expect(pipeline).toBeInstanceOf(ProfileValidationPipeline);
   });

   it('should create custom pipeline when custom handlers provided', () => {
      const customHandler = factory.createIdentityHandler();
      const pipeline = factory.createPipeline([customHandler]);
      expect(pipeline).toBeInstanceOf(ProfileValidationPipeline);
   });
});
