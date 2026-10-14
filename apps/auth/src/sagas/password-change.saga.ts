import { Logger } from '@nestjs/common';
import type { IAccountRepository } from '@auth/repositories';

export class PasswordChangeSaga {
   private accountId?: string;
   private oldPasswordHash?: string;
   private passwordUpdated = false;
   private readonly logger = new Logger(PasswordChangeSaga.name);

   constructor(private readonly accountRepository: IAccountRepository) {}

   setAccount(accountId: string, oldPasswordHash: string): void {
      this.accountId = accountId;
      this.oldPasswordHash = oldPasswordHash;
   }

   markPasswordUpdated(): void {
      this.passwordUpdated = true;
   }

   async rollback(): Promise<void> {
      if (!this.passwordUpdated || !this.accountId || !this.oldPasswordHash) {
         return;
      }

      this.logger.warn(`Compensating transaction: rolling back password change for account ${this.accountId}`);
      try {
         await this.accountRepository.update(this.accountId, {
            passwordHash: this.oldPasswordHash,
         });
      } catch (error: unknown) {
         this.logger.error(
            `PasswordChangeSaga compensation failed: Unable to restore old password for account ${this.accountId}`,
            error instanceof Error ? error.stack : error,
         );
      }
   }
}
