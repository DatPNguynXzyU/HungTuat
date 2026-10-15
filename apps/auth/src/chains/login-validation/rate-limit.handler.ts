import { Inject, Injectable } from '@nestjs/common';
import { AUTH_RATE_LIMITER, type IAuthRateLimiter } from '@auth/services/infrastructure';
import { AbstractLoginValidationHandler } from '@auth/chains/login-validation/abstract-login-validation.handler';
import type { LoginValidationContext } from '@auth/chains/login-validation/login-validation.context';

/**
 * Validates whether the incoming login request conforms to global and IP/email rate limits.
 */
@Injectable()
export class RateLimitHandler extends AbstractLoginValidationHandler {
   constructor(
      @Inject(AUTH_RATE_LIMITER)
      private readonly rateLimiter: IAuthRateLimiter,
   ) {
      super();
   }

   override async handle(context: LoginValidationContext): Promise<void> {
      await this.rateLimiter.checkLogin(context.email, context.clientIp);
      return super.handle(context);
   }
}
