import type {
   CannotFollowSelfSpecification,
   FollowRequestPendingSpecification,
   UserActiveSpecification,
   FollowOwnershipSpecification,
   UserCanFollowSpecification,
} from '@user/domain/specifications';

export const USER_SPECIFICATION_FACTORY = 'USER_SPECIFICATION_FACTORY';

export interface IUserSpecificationFactory {
   createCannotFollowSelfSpecification(): CannotFollowSelfSpecification;
   createFollowRequestPendingSpecification(): FollowRequestPendingSpecification;
   createUserActiveSpecification(): UserActiveSpecification;
   createFollowOwnershipSpecification(): FollowOwnershipSpecification;
   createUserCanFollowSpecification(): UserCanFollowSpecification;
}
