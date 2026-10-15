import {
   CannotFollowSelfSpecification,
   FollowRequestPendingSpecification,
   UserActiveSpecification,
   FollowOwnershipSpecification,
   UserCanFollowSpecification,
} from '@user/domain/specifications';
import { UserSpecificationFactory } from '@user/factories/user-specification.factory';

describe('UserSpecificationFactory', () => {
   let factory: UserSpecificationFactory;

   beforeEach(() => {
      factory = new UserSpecificationFactory();
   });

   it('should be defined', () => {
      expect(factory).toBeDefined();
   });

   it('should create CannotFollowSelfSpecification', () => {
      expect(factory.createCannotFollowSelfSpecification()).toBeInstanceOf(CannotFollowSelfSpecification);
   });

   it('should create FollowRequestPendingSpecification', () => {
      expect(factory.createFollowRequestPendingSpecification()).toBeInstanceOf(FollowRequestPendingSpecification);
   });

   it('should create UserActiveSpecification', () => {
      expect(factory.createUserActiveSpecification()).toBeInstanceOf(UserActiveSpecification);
   });

   it('should create FollowOwnershipSpecification', () => {
      expect(factory.createFollowOwnershipSpecification()).toBeInstanceOf(FollowOwnershipSpecification);
   });

   it('should create UserCanFollowSpecification', () => {
      expect(factory.createUserCanFollowSpecification()).toBeInstanceOf(UserCanFollowSpecification);
   });
});
