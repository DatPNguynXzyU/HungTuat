import { Injectable, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AUTH_ERROR_CODES } from '@contracts/auth';
import { AccountCanAuthenticateSpecification } from '@auth/domain/specifications';
import { AuditLogService } from '@auth/services/infrastructure';
import { AbstractLoginValidationHandler } from '@auth/chains/login-validation/abstract-login-validation.handler';
import type { LoginValidationContext } from '@auth/chains/login-validation/login-validation.context';

/**
 * Validates domain status specifications for the account (e.g. active, not blocked, not suspended).
 */
@Injectable()
export class AccountStatusHandler extends AbstractLoginValidationHandler {
   constructor(
      @Optional()
      private readonly accountCanAuthenticateSpec: AccountCanAuthenticateSpecification = new AccountCanAuthenticateSpecification(),
      auditLogService?: AuditLogService,
      eventEmitter?: EventEmitter2,
   ) {
      super(undefined, auditLogService, eventEmitter);
   }

   override async handle(context: LoginValidationContext): Promise<void> {
      if (!context.account) {
         return this.handleFailure(context, AUTH_ERROR_CODES.INVALID_CREDENTIALS);
      }

      const authValidation = this.accountCanAuthenticateSpec.validate(context.account);
      if (authValidation.isFailure()) {
         const errorCode = authValidation.getError();
         return this.handleFailure(context, errorCode, {
            accountId: context.account.accountId,
         });
      }

      return super.handle(context);
   }
}
