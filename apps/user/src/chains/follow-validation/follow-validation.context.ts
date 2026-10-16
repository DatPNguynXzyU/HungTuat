import type { FollowEntity, FollowStatus, UserEntity } from '@user/entities';
import type { FollowOperation } from '@user/constants';
import type { FollowOperationOptions } from '@user/sagas/follow';

export interface FollowValidationContext {
   readonly operation: FollowOperation;
   readonly followerId?: string;
   readonly followingId?: string;
   readonly followId?: string;
   readonly options?: FollowOperationOptions;

   // Enriched attributes throughout the chain execution
   follower?: UserEntity;
   following?: UserEntity;
   follow?: FollowEntity;
   status?: FollowStatus;
}
