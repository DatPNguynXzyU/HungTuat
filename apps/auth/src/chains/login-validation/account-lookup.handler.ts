import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RedisService } from '@common';
import { ACCOUNT_REPOSITORY, type IAccountRepository } from '@auth/repositories';
import { AuditLogService } from '@auth/services/infrastructure';
import { AbstractLoginValidationHandler } from '@auth/chains/login-validation/abstract-login-validation.handler';
import type { LoginValidationContext } from '@auth/chains/login-validation/login-validation.context';

/**
 * Validates account existence in the persistence store.
 * If the account does not exist, triggers credential failure handling to prevent user enumeration.
 */
@Injectable()
export class AccountLookupHandler extends AbstractLoginValidationHandler {
   constructor(
      @Inject(ACCOUNT_REPOSITORY)
      private readonly accountRepository: IAccountRepository,
      redisService: RedisService,
      auditLogService: AuditLogService,
      eventEmitter: EventEmitter2,
   ) {
      super(redisService, auditLogService, eventEmitter);
   }

   override async handle(context: LoginValidationContext): Promise<void> {
      const account = await this.accountRepository.findByEmail(context.email);
      if (!account) {
         return this.handleCredentialFailure(context);
      }

      context.account = account;
      return super.handle(context);
   }
}
