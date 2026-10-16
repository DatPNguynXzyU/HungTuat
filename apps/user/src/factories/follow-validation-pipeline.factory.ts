import { Inject, Injectable, Optional } from '@nestjs/common';
import type { IChainHandler } from '@common';
import {
   FollowValidationPipeline,
   FollowSelfValidationHandler,
   FollowUserResolutionHandler,
   FollowRelationshipHandler,
   FollowRequestStatusHandler,
   type FollowValidationContext,
} from '@user/chains/follow-validation';
import { UserResolverService } from '@user/services/infrastructure/user-resolver.service';
import { FOLLOW_REPOSITORY, type IFollowRepository } from '@user/repositories/follow.repository.interface';
import {
   GRAPH_FOLLOW_REPOSITORY,
   type IFollowGraphRepository,
} from '@user/repositories/follow-graph.repository.interface';
import { USER_SPECIFICATION_FACTORY } from '@user/constants';
import type { IUserSpecificationFactory } from '@user/factories/user-specification.factory.interface';
import type { IFollowValidationPipelineFactory } from '@user/factories/follow-validation-pipeline.factory.interface';

/**
 * Factory responsible for assembling the follow validation Chain of Responsibility pipeline.
 * Encapsulates the instantiation and ordered chaining of validation handlers.
 */
@Injectable()
export class FollowValidationPipelineFactory implements IFollowValidationPipelineFactory {
   constructor(
      private readonly userResolverService: UserResolverService,
      @Inject(FOLLOW_REPOSITORY)
      private readonly followRepository: IFollowRepository,
      @Inject(GRAPH_FOLLOW_REPOSITORY)
      private readonly graphFollowRepository: IFollowGraphRepository,
      @Optional()
      @Inject(USER_SPECIFICATION_FACTORY)
      private readonly specificationFactory?: IUserSpecificationFactory,
   ) {}

   createSelfValidationHandler(): FollowSelfValidationHandler {
      const spec = this.specificationFactory?.createCannotFollowSelfSpecification();
      return new FollowSelfValidationHandler(spec);
   }

   createUserResolutionHandler(): FollowUserResolutionHandler {
      const spec = this.specificationFactory?.createUserActiveSpecification();
      return new FollowUserResolutionHandler(this.userResolverService, spec);
   }

   createRelationshipHandler(): FollowRelationshipHandler {
      return new FollowRelationshipHandler(this.followRepository, this.graphFollowRepository);
   }

   createRequestStatusHandler(): FollowRequestStatusHandler {
      const spec = this.specificationFactory?.createFollowRequestPendingSpecification();
      return new FollowRequestStatusHandler(this.followRepository, spec);
   }

   createPipeline(customHandlers?: IChainHandler<FollowValidationContext, void>[]): FollowValidationPipeline {
      if (customHandlers && customHandlers.length > 0) {
         return new FollowValidationPipeline(customHandlers);
      }

      const handlers: IChainHandler<FollowValidationContext, void>[] = [
         this.createSelfValidationHandler(),
         this.createUserResolutionHandler(),
         this.createRelationshipHandler(),
         this.createRequestStatusHandler(),
      ];

      return new FollowValidationPipeline(handlers);
   }
}
