import { Test, type TestingModule } from '@nestjs/testing';
import {
   FollowValidationPipeline,
   FollowSelfValidationHandler,
   FollowUserResolutionHandler,
   FollowRelationshipHandler,
   FollowRequestStatusHandler,
} from '@user/chains/follow-validation';
import { UserResolverService } from '@user/services/infrastructure/user-resolver.service';
import { FOLLOW_REPOSITORY, GRAPH_FOLLOW_REPOSITORY } from '@user/repositories';
import { USER_SPECIFICATION_FACTORY } from '@user/constants';
import { FollowValidationPipelineFactory } from '@user/factories/follow-validation-pipeline.factory';

describe('FollowValidationPipelineFactory', () => {
   let factory: FollowValidationPipelineFactory;

   const mockUserResolverService = {
      resolveUser: jest.fn(),
   };

   const mockFollowRepository = {
      findById: jest.fn(),
      findByFollowerAndFollowing: jest.fn(),
   };

   const mockGraphFollowRepository = {
      findFollow: jest.fn(),
   };

   const mockSpecificationFactory = {
      createCannotFollowSelfSpecification: jest.fn().mockReturnValue({}),
      createUserActiveSpecification: jest.fn().mockReturnValue({}),
      createFollowRequestPendingSpecification: jest.fn().mockReturnValue({}),
   };

   beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
         providers: [
            FollowValidationPipelineFactory,
            { provide: UserResolverService, useValue: mockUserResolverService },
            { provide: FOLLOW_REPOSITORY, useValue: mockFollowRepository },
            { provide: GRAPH_FOLLOW_REPOSITORY, useValue: mockGraphFollowRepository },
            { provide: USER_SPECIFICATION_FACTORY, useValue: mockSpecificationFactory },
         ],
      }).compile();

      factory = module.get<FollowValidationPipelineFactory>(FollowValidationPipelineFactory);
   });

   it('should be defined', () => {
      expect(factory).toBeDefined();
   });

   it('should create individual handlers', () => {
      expect(factory.createSelfValidationHandler()).toBeInstanceOf(FollowSelfValidationHandler);
      expect(factory.createUserResolutionHandler()).toBeInstanceOf(FollowUserResolutionHandler);
      expect(factory.createRelationshipHandler()).toBeInstanceOf(FollowRelationshipHandler);
      expect(factory.createRequestStatusHandler()).toBeInstanceOf(FollowRequestStatusHandler);
   });

   it('should create default FollowValidationPipeline with all 4 handlers', () => {
      const pipeline = factory.createPipeline();
      expect(pipeline).toBeInstanceOf(FollowValidationPipeline);
   });

   it('should create custom pipeline when custom handlers provided', () => {
      const customHandler = factory.createSelfValidationHandler();
      const pipeline = factory.createPipeline([customHandler]);
      expect(pipeline).toBeInstanceOf(FollowValidationPipeline);
   });
});
