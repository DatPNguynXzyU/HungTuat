import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RedisService } from '@common';
import { PASSWORD_HASHER, type IPasswordHasher, AuditLogService } from '@auth/services/infrastructure';
import { AbstractLoginValidationHandler } from '@auth/chains/login-validation/abstract-login-validation.handler';
import type { LoginValidationContext } from '@auth/chains/login-validation/login-validation.context';

/**
 * Validates the raw password against the hashed credentials stored in the account.
 */
@Injectable()
export class PasswordVerificationHandler extends AbstractLoginValidationHandler {
   constructor(
      @Inject(PASSWORD_HASHER)
      private readonly passwordHasher: IPasswordHasher,
      redisService: RedisService,
      auditLogService: AuditLogService,
      eventEmitter: EventEmitter2,
   ) {
      super(redisService, auditLogService, eventEmitter);
   }

   override async handle(context: LoginValidationContext): Promise<void> {
      if (!context.account) {
         return this.handleCredentialFailure(context);
      }

      const isValid = await this.passwordHasher.verify(context.account.passwordHash, context.password);
      if (!isValid) {
         return this.handleCredentialFailure(context, context.account.id);
      }

      return super.handle(context);
   }
}
