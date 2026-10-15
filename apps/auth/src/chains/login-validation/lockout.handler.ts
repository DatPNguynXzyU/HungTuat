import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RedisService } from '@common';
import { AUTH_ERROR_CODES } from '@contracts/auth';
import { AUTH_LOCKOUT_VALUE, AUTH_REDIS_TTL } from '@auth/constants';
import { AuditLogService } from '@auth/services/infrastructure';
import { AbstractLoginValidationHandler } from '@auth/chains/login-validation/abstract-login-validation.handler';
import type { LoginValidationContext } from '@auth/chains/login-validation/login-validation.context';

/**
 * Validates whether the account is currently subject to a temporary lockout due to
 * consecutive failed authentication attempts.
 */
@Injectable()
export class LockoutHandler extends AbstractLoginValidationHandler {
   constructor(redisService: RedisService, auditLogService: AuditLogService, eventEmitter: EventEmitter2) {
      super(redisService, auditLogService, eventEmitter);
   }

   override async handle(context: LoginValidationContext): Promise<void> {
      if (this.redisService) {
         const isLocked = await this.redisService.get(context.lockoutKey);
         if (isLocked === AUTH_LOCKOUT_VALUE || Boolean(isLocked)) {
            const remainingSeconds = await this.redisService.ttl(context.lockoutKey);
            const remainingMinutes = Math.max(
               Math.ceil((remainingSeconds > 0 ? remainingSeconds : AUTH_REDIS_TTL.AUTH_LOCKOUT) / 60),
               1,
            );

            return this.handleFailure(context, AUTH_ERROR_CODES.ACCOUNT_LOCKED_TEMPORARILY, {
               metadata: { remainingSeconds },
               params: {
                  email: context.email,
                  ip: context.clientIp,
                  remainingSeconds: remainingSeconds > 0 ? remainingSeconds : AUTH_REDIS_TTL.AUTH_LOCKOUT,
                  remainingMinutes,
               },
            });
         }
      }

      return super.handle(context);
   }
}
