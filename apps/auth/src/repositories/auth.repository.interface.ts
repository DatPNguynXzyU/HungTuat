import type { CreateUserData, RoleEntity, UserEntity } from '@auth/entities/user.entity';

export const AUTH_REPOSITORY = Symbol('AUTH_REPOSITORY');

export interface IAuthRepository {
   findByEmail(email: string): Promise<UserEntity | null>;
   findById(id: string): Promise<UserEntity | null>;
   createUser(data: CreateUserData): Promise<UserEntity>;
   updateUser(id: string, data: Partial<UserEntity>): Promise<UserEntity | null>;
   deleteUser(id: string): Promise<boolean>;
   findRoleByCode(code: string): Promise<RoleEntity | null>;
   assignRoleToUser(userId: string, roleId: string): Promise<void>;
}
