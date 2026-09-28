import type { CreateUserData, RoleEntity, UserEntity } from '@auth/entities/user.entity';
import type { CreateOutboxEventData } from '@auth/outbox/entities/outbox-event.entity';

export const AUTH_REPOSITORY = Symbol('AUTH_REPOSITORY');

export interface IAuthRepository {
   findByEmail(email: string): Promise<UserEntity | null>;
   findById(id: string): Promise<UserEntity | null>;
   createUser(data: CreateUserData, outboxEvent?: CreateOutboxEventData): Promise<UserEntity>;
   updateUser(id: string, data: Partial<UserEntity>): Promise<UserEntity | null>;
   deleteUser(id: string): Promise<boolean>;
   findRoleByCode(code: string): Promise<RoleEntity | null>;
   assignRoleToUser(userId: string, roleId: string): Promise<void>;
}
