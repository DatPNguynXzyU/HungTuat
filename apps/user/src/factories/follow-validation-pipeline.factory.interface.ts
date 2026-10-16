import type { IChainHandler } from '@common';
import { FOLLOW_VALIDATION_PIPELINE_FACTORY } from '@user/constants';
import type { FollowValidationContext } from '@user/chains/follow-validation/follow-validation.context';
import type { FollowValidationPipeline } from '@user/chains/follow-validation/follow-validation.pipeline';
import type { FollowSelfValidationHandler } from '@user/chains/follow-validation/follow-self-validation.handler';
import type { FollowUserResolutionHandler } from '@user/chains/follow-validation/follow-user-resolution.handler';
import type { FollowRelationshipHandler } from '@user/chains/follow-validation/follow-relationship.handler';
import type { FollowRequestStatusHandler } from '@user/chains/follow-validation/follow-request-status.handler';

export { FOLLOW_VALIDATION_PIPELINE_FACTORY };

export interface IFollowValidationPipelineFactory {
   createPipeline(customHandlers?: IChainHandler<FollowValidationContext, void>[]): FollowValidationPipeline;
   createSelfValidationHandler(): FollowSelfValidationHandler;
   createUserResolutionHandler(): FollowUserResolutionHandler;
   createRelationshipHandler(): FollowRelationshipHandler;
   createRequestStatusHandler(): FollowRequestStatusHandler;
}
