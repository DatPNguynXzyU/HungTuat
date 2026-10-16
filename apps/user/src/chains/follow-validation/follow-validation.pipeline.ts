import { Injectable, Optional } from '@nestjs/common';
import { Chain, type IChainHandler } from '@common';
import type { FollowValidationContext } from '@user/chains/follow-validation/follow-validation.context';
import { FollowSelfValidationHandler } from '@user/chains/follow-validation/follow-self-validation.handler';
import { FollowUserResolutionHandler } from '@user/chains/follow-validation/follow-user-resolution.handler';
import { FollowRelationshipHandler } from '@user/chains/follow-validation/follow-relationship.handler';
import { FollowRequestStatusHandler } from '@user/chains/follow-validation/follow-request-status.handler';

/**
 * Pipeline coordinating the follow validation Chain of Responsibility.
 * Executes steps sequentially:
 * 1. Self Follow & Identifier Checks (Cannot follow self)
 * 2. User Resolution & Active Lifecycle Validation
 * 3. Relationship Existence & Duplicate Prevention (Graph/DB checks)
 * 4. Request Existence & Status Invariants (Pending vs Accepted)
 */
@Injectable()
export class FollowValidationPipeline extends Chain<FollowValidationContext, void> {
   constructor(
      @Optional()
      handlersOrSelfValidation?: IChainHandler<FollowValidationContext, void>[] | FollowSelfValidationHandler,
      @Optional()
      userResolutionHandler?: FollowUserResolutionHandler,
      @Optional()
      relationshipHandler?: FollowRelationshipHandler,
      @Optional()
      requestStatusHandler?: FollowRequestStatusHandler,
   ) {
      if (Array.isArray(handlersOrSelfValidation)) {
         super(handlersOrSelfValidation);
      } else {
         const handlers = [
            handlersOrSelfValidation,
            userResolutionHandler,
            relationshipHandler,
            requestStatusHandler,
         ].filter((h): h is NonNullable<typeof h> => Boolean(h));
         super(handlers);
      }
   }

   /**
    * Executes the sequential validation chain on the given follow context.
    */
   async validate(context: FollowValidationContext): Promise<void> {
      await this.execute(context);
   }
}
