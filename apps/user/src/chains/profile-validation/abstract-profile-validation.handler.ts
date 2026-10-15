import { Logger } from '@nestjs/common';
import { AbstractChainHandler } from '@common';
import type { ProfileValidationContext } from '@user/chains/profile-validation/profile-validation.context';

/**
 * Base abstract handler for the Profile validation chain.
 * Encapsulates common logger and delegation behavior across validation steps.
 */
export abstract class AbstractProfileValidationHandler extends AbstractChainHandler<ProfileValidationContext, void> {
   protected readonly logger = new Logger(this.constructor.name);
}
