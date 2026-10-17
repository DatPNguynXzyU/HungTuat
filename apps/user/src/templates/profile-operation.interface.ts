import type { UserEntity } from '@user/entities';
import type { CreateUserData, UpdateUserData } from '@user/repositories';
import type { ProfileOperation } from '@user/constants';

/**
 * Options configuring runtime execution of a profile operation.
 */
export interface ProfileOperationOptions {
   skipValidation?: boolean;
   isActorAdmin?: boolean;
}

/**
 * Base mutable context passed across invariant steps of the Template Method.
 */
export interface BaseProfileOperationContext {
   readonly operation: ProfileOperation;
   readonly startTime: number;
   options?: ProfileOperationOptions;
   userId?: string;
   accountId?: string;
   existingUser?: UserEntity | null;
   shortCircuited?: boolean;
   isActorAdmin?: boolean;
}

/**
 * Context for user profile creation operation.
 */
export interface CreateProfileContext extends BaseProfileOperationContext {
   readonly data: CreateUserData;
   createdUser?: UserEntity;
}

/**
 * Context for user profile update operation.
 */
export interface UpdateProfileContext extends BaseProfileOperationContext {
   readonly userId: string;
   readonly data: UpdateUserData;
   updatedUser?: UserEntity;
}

/**
 * Context for username modification operation.
 */
export interface UpdateUsernameContext extends BaseProfileOperationContext {
   readonly userId: string;
   readonly username: string;
   normalizedUsername?: string;
   updatedUser?: UserEntity;
}

/**
 * Context for user profile soft-deletion operation.
 */
export interface DeleteProfileContext extends BaseProfileOperationContext {
   readonly userId: string;
   deletedUser?: UserEntity;
}

/**
 * Context for user profile restoration operation.
 */
export interface RestoreProfileContext extends BaseProfileOperationContext {
   readonly userId: string;
   restoredUser?: UserEntity;
}

/**
 * Parameter payload types for each concrete profile operation.
 */
export type CreateProfileParams = CreateUserData;

export interface UpdateProfileParams {
   userId: string;
   data: UpdateUserData;
   options?: ProfileOperationOptions;
}

export interface UpdateUsernameParams {
   userId: string;
   username: string;
   options?: ProfileOperationOptions;
}

export interface DeleteProfileParams {
   userId: string;
   options?: ProfileOperationOptions;
}

export interface RestoreProfileParams {
   userId: string;
   options?: ProfileOperationOptions;
}

/**
 * Common interface representing executable profile operations.
 */
export interface IProfileOperation<TParams, TResult = UserEntity> {
   execute(params: TParams): Promise<TResult>;
}
