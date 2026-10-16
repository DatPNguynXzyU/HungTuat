import { Logger } from '@nestjs/common';
import { AbstractChainHandler } from '@common';
import type { FollowValidationContext } from '@user/chains/follow-validation/follow-validation.context';

/**
 * Base abstract handler for the Follow validation chain.
 * Encapsulates common logger and delegation behavior across validation steps.
 */
export abstract class AbstractFollowValidationHandler extends AbstractChainHandler<FollowValidationContext, void> {
   protected readonly logger = new Logger(this.constructor.name);
}
