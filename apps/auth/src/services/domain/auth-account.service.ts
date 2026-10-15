import { Inject, Injectable } from '@nestjs/common';
import { NotFoundException } from '@common';
import { AUTH_ERROR_CODES, UserEmailResponseDto } from '@contracts/auth';
import { ACCOUNT_REPOSITORY, type IAccountRepository } from '@auth/repositories';

@Injectable()
export class AuthAccountService {
   constructor(@Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository) {}

   async getEmail(accountId: string): Promise<UserEmailResponseDto> {
      const account = await this.accountRepository.findById(accountId);
      if (!account) {
         throw new NotFoundException(AUTH_ERROR_CODES.USER_NOT_FOUND, {
            params: { id: accountId },
         });
      }

      return {
         id: account.id,
         email: account.email,
         isEmailVerified: account.isEmailVerified ?? false,
      };
   }
}
