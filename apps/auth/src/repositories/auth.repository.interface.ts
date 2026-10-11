import type { AccountEntity, CreateAccountData, RoleEntity } from '@auth/entities/account.entity';
import type { CreateOutboxEventData } from '@auth/outbox/entities/outbox-event.entity';

export const AUTH_REPOSITORY = Symbol('AUTH_REPOSITORY');

export interface AccountEmailRecord {
   id: string;
   email: string;
   isEmailVerified: boolean;
}

export interface IAuthRepository {
   findByEmail(email: string): Promise<AccountEntity | null>;
   findById(accountId: string): Promise<AccountEntity | null>;
   findEmailById(accountId: string): Promise<AccountEmailRecord | null>;
   findAllEmails(): Promise<string[]>;
   createAccount(data: CreateAccountData, outboxEvent?: CreateOutboxEventData): Promise<AccountEntity>;
   updateAccount(accountId: string, data: Partial<AccountEntity>): Promise<AccountEntity | null>;
   deleteAccount(accountId: string): Promise<boolean>;
   findRoleByCode(code: string): Promise<RoleEntity | null>;
   assignRoleToAccount(accountId: string, roleId: string): Promise<void>;
}
