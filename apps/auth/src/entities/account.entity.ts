export interface AccountEntity {
   id: string;
   email: string;
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

export type CreateAccountData = Omit<AccountEntity, 'id' | 'createdAt' | 'updatedAt' | 'roles'> & {
   id?: string;
   createdAt?: string;
   roleId?: string;
   status?: string;
   isEmailVerified?: boolean;
   lastLoginAt?: string | null;
   version?: number;
   deletedAt?: string | null;
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
