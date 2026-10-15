import { Injectable } from '@nestjs/common';
import {
   CannotFollowSelfSpecification,
   FollowRequestPendingSpecification,
   UserActiveSpecification,
   FollowOwnershipSpecification,
   UserCanFollowSpecification,
} from '@user/domain/specifications';
import type { IUserSpecificationFactory } from '@user/factories/user-specification.factory.interface';

/**
 * Factory responsible for creating domain specifications in the User domain.
 * Decouples domain services and composite specifications from direct operator new instantiation.
 */
@Injectable()
export class UserSpecificationFactory implements IUserSpecificationFactory {
   createCannotFollowSelfSpecification(): CannotFollowSelfSpecification {
      return new CannotFollowSelfSpecification();
   }

   createFollowRequestPendingSpecification(): FollowRequestPendingSpecification {
      return new FollowRequestPendingSpecification();
   }

   createUserActiveSpecification(): UserActiveSpecification {
      return new UserActiveSpecification();
   }

   createFollowOwnershipSpecification(): FollowOwnershipSpecification {
      return new FollowOwnershipSpecification();
   }

   createUserCanFollowSpecification(): UserCanFollowSpecification {
      return new UserCanFollowSpecification(
         this.createCannotFollowSelfSpecification(),
         this.createUserActiveSpecification(),
      );
   }
}
