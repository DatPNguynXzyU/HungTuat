import type { SetOptional } from '@common';

export interface AccountEntity {
   id: string;
   email: string;
   phoneNumber?: string | null;
   passwordHash: string;
   status?: string;
   isEmailVerified?: boolean;
   lastLoginAt?: string | null;
   version?: number;
   deletedAt?: string | null;
   roles?: string[];
   createdAt: string;
   updatedAt?: string;
}

export type CreateAccountData = SetOptional<Omit<AccountEntity, 'roles'>, 'id' | 'createdAt'> & {
   roleId?: string;
};

export interface RoleEntity {
   id: string;
   code: string;
   name: string;
   description?: string | null;
   version?: number;
   deletedAt?: string | null;
   permissions?: string[];
   createdAt?: string;
   updatedAt?: string;
}

export interface PermissionEntity {
   id: string;
   code: string;
   name: string;
   description?: string | null;
   version?: number;
   deletedAt?: string | null;
   createdAt?: string;
   updatedAt?: string;
}
