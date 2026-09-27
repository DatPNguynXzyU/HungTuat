export interface UserEntity {
   id: string;
   email: string;
   fullName: string;
   passwordHash: string;
   roles?: string[];
   createdAt: string;
   updatedAt?: string;
}

export type CreateUserData = Omit<UserEntity, 'id' | 'createdAt' | 'updatedAt' | 'roles'> & {
   id?: string;
   createdAt?: string;
   roleId?: string;
};

export interface RoleEntity {
   id: string;
   code: string;
   name: string;
   description?: string | null;
   permissions?: string[];
   createdAt?: string;
   updatedAt?: string;
}

export interface PermissionEntity {
   id: string;
   code: string;
   name: string;
   description?: string | null;
   createdAt?: string;
   updatedAt?: string;
}
