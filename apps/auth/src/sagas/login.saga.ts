import { Logger } from '@nestjs/common';
import type { AccountEntity } from '@auth/entities';
import type { IAccountRepository } from '@auth/repositories';
import type { ITokenLifecycleService, TokenPair } from '@auth/services/infrastructure';
import type { IAuthSaga } from '@auth/templates';

export class LoginSaga implements IAuthSaga {
   private account?: AccountEntity;
   private previousLastLoginAt?: string | null;
   private tokens?: TokenPair;
   private dbUpdated = false;
   private readonly logger = new Logger(LoginSaga.name);

   constructor(
      private readonly tokenLifecycleService: ITokenLifecycleService,
      private readonly accountRepository: IAccountRepository,
   ) {}

   setAccount(account: AccountEntity): void {
      this.account = account;
      this.previousLastLoginAt = account.lastLoginAt;
   }

   setTokens(tokens: TokenPair): void {
      this.tokens = tokens;
   }

   markDatabaseUpdated(): void {
      this.dbUpdated = true;
   }

   async rollback(): Promise<void> {
      if (!this.account) {
         return;
      }

      this.logger.warn(`Compensating transaction: rolling back login flow for account ${this.account.accountId}`);

      if (this.tokens) {
         try {
            await this.tokenLifecycleService.revokeAllAccountTokens(this.account.accountId);
         } catch (error: unknown) {
            this.logger.error(
               `LoginSaga compensation failed: Unable to revoke tokens for account ${this.account.accountId}`,
               error instanceof Error ? error.stack : error,
            );
         }
      }

      if (this.dbUpdated) {
         try {
            await this.accountRepository.update(this.account.accountId, {
               lastLoginAt: this.previousLastLoginAt ?? null,
            });
         } catch (error: unknown) {
            this.logger.error(
               `LoginSaga compensation failed: Unable to revert lastLoginAt for account ${this.account.accountId}`,
               error instanceof Error ? error.stack : error,
            );
         }
      }
   }
}
