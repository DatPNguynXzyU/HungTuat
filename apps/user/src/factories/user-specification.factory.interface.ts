import type {
   CannotFollowSelfSpecification,
   FollowRequestPendingSpecification,
   UserActiveSpecification,
   FollowOwnershipSpecification,
   UserCanFollowSpecification,
} from '@user/domain/specifications';

export interface IUserSpecificationFactory {
   createCannotFollowSelfSpecification(): CannotFollowSelfSpecification;
   createFollowRequestPendingSpecification(): FollowRequestPendingSpecification;
   createUserActiveSpecification(): UserActiveSpecification;
   createFollowOwnershipSpecification(): FollowOwnershipSpecification;
   createUserCanFollowSpecification(): UserCanFollowSpecification;
}
