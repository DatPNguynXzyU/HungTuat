import type { AccountEntity, CreateAccountData } from '@auth/entities/account.entity';

export const ACCOUNT_REPOSITORY = Symbol('ACCOUNT_REPOSITORY');

export interface AccountEmailRecord {
   id: string;
   email: string;
   isEmailVerified: boolean;
}

export interface IAccountRepository {
   findByEmail(email: string): Promise<AccountEntity | null>;
   findById(accountId: string): Promise<AccountEntity | null>;
   findEmailById(accountId: string): Promise<AccountEmailRecord | null>;
   findAllEmails(): Promise<string[]>;
   create(data: CreateAccountData): Promise<AccountEntity>;
   update(accountId: string, data: Partial<AccountEntity>): Promise<AccountEntity | null>;
   softDelete(accountId: string): Promise<boolean>;
   delete(accountId: string): Promise<boolean>;
}
