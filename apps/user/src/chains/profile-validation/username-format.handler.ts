import { Injectable } from '@nestjs/common';
import { BadRequestException } from '@common';
import { USER_ERROR_CODES } from '@contracts/user';
import { Username } from '@user/domain/value-objects';
import { AbstractProfileValidationHandler } from '@user/chains/profile-validation/abstract-profile-validation.handler';
import type { ProfileValidationContext } from '@user/chains/profile-validation/profile-validation.context';

/**
 * Validates username syntax, length, allowed characters, and domain invariants
 * using the Username Value Object.
 */
@Injectable()
export class UsernameFormatHandler extends AbstractProfileValidationHandler {
   override async handle(context: ProfileValidationContext): Promise<void> {
      if (context.username !== undefined && context.username !== null && context.username !== '') {
         const result = Username.create(context.username);

         if (result.isFailure()) {
            throw new BadRequestException(result.getError() || USER_ERROR_CODES.INVALID_USERNAME_FORMAT, {
               params: result.getParams(),
            });
         }

         context.normalizedUsername = result.getValue().getValue();
      }

      return super.handle(context);
   }
}
