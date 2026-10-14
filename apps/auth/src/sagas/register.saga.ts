import { Logger } from '@nestjs/common';
import type { AccountEntity } from '@auth/entities';
import type { IAccountRepository } from '@auth/repositories';
import type { IOutboxRepository } from '@auth/outbox/repositories/outbox.repository.interface';
import type { ITokenLifecycleService, TokenPair } from '@auth/services/infrastructure';

export class RegisterSaga {
   private account?: AccountEntity;
   private tokens?: TokenPair;
   private readonly logger = new Logger(RegisterSaga.name);

   constructor(
      private readonly accountRepository: IAccountRepository,
      private readonly tokenLifecycleService: ITokenLifecycleService,
      private readonly outboxRepository?: IOutboxRepository,
   ) {}

   setAccount(account: AccountEntity): void {
      this.account = account;
   }

   setTokens(tokens: TokenPair): void {
      this.tokens = tokens;
   }

   async rollback(): Promise<void> {
      if (!this.account) {
         return;
      }

      this.logger.warn(`Compensating transaction: rolling back registration flow for account ${this.account.id}`);

      if (this.tokens) {
         try {
            await this.tokenLifecycleService.revokeAllAccountTokens(this.account.id);
         } catch (error: unknown) {
            this.logger.error(
               `RegisterSaga compensation failed: Unable to revoke tokens for account ${this.account.id}`,
               error instanceof Error ? error.stack : error,
            );
         }
      }

      if (this.outboxRepository) {
         try {
            await this.outboxRepository.deleteByAggregateId(this.account.id);
         } catch (error: unknown) {
            this.logger.error(
               `RegisterSaga compensation failed: Unable to delete outbox events for account ${this.account.id}`,
               error instanceof Error ? error.stack : error,
            );
         }
      }

      try {
         await this.accountRepository.delete(this.account.id);
      } catch (error: unknown) {
         this.logger.error(
            `RegisterSaga compensation failed: Unable to delete account ${this.account.id}`,
            error instanceof Error ? error.stack : error,
         );
      }
   }
}
