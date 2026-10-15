import { Injectable, Optional } from '@nestjs/common';
import { Chain, type IChainHandler, UnauthorizedException } from '@common';
import { AUTH_ERROR_CODES } from '@contracts/auth';
import type { AccountEntity } from '@auth/entities';
import type { LoginValidationContext } from '@auth/chains/login-validation/login-validation.context';
import { RateLimitHandler } from '@auth/chains/login-validation/rate-limit.handler';
import { LockoutHandler } from '@auth/chains/login-validation/lockout.handler';
import { AccountLookupHandler } from '@auth/chains/login-validation/account-lookup.handler';
import { PasswordVerificationHandler } from '@auth/chains/login-validation/password-verification.handler';
import { AccountStatusHandler } from '@auth/chains/login-validation/account-status.handler';

/**
 * Pipeline coordinating the login validation Chain of Responsibility.
 * Executes the steps in sequence:
 * 1. Rate Limiting Check
 * 2. Temporary Lockout Check
 * 3. Account Existence & Lookup
 * 4. Password Verification
 * 5. Account Domain Specification Status Check
 */
@Injectable()
export class LoginValidationPipeline extends Chain<LoginValidationContext, void> {
   constructor(
      @Optional()
      rateLimitOrHandlers?: IChainHandler<LoginValidationContext, void>[] | RateLimitHandler,
      @Optional()
      lockoutHandler?: LockoutHandler,
      @Optional()
      accountLookupHandler?: AccountLookupHandler,
      @Optional()
      passwordVerificationHandler?: PasswordVerificationHandler,
      @Optional()
      accountStatusHandler?: AccountStatusHandler,
   ) {
      if (Array.isArray(rateLimitOrHandlers)) {
         super(rateLimitOrHandlers);
      } else {
         const handlers = [
            rateLimitOrHandlers,
            lockoutHandler,
            accountLookupHandler,
            passwordVerificationHandler,
            accountStatusHandler,
         ].filter((h): h is NonNullable<typeof h> => Boolean(h));
         super(handlers);
      }
   }

   /**
    * Executes the validation chain on the login context and returns the validated AccountEntity.
    */
   async validate(context: LoginValidationContext): Promise<AccountEntity> {
      await this.execute(context);
      if (!context.account) {
         throw new UnauthorizedException(AUTH_ERROR_CODES.INVALID_CREDENTIALS);
      }
      return context.account;
   }
}
