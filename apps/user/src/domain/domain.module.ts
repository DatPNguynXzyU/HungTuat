import { Module } from '@nestjs/common';
import { UserAdaptersModule } from '@user/adapters';
import {
   CannotFollowSelfSpecification,
   FollowRequestPendingSpecification,
   UserActiveSpecification,
   FollowOwnershipSpecification,
   UserCanFollowSpecification,
} from '@user/domain/specifications';
import {
   UserSearchIndexingHandler,
   UserFollowNotificationHandler,
   UserMetricsHandler,
} from '@user/domain/event-handlers';

export const USER_SPECIFICATIONS = [
   CannotFollowSelfSpecification,
   FollowRequestPendingSpecification,
   UserActiveSpecification,
   FollowOwnershipSpecification,
   UserCanFollowSpecification,
];

export const USER_EVENT_HANDLERS = [UserSearchIndexingHandler, UserFollowNotificationHandler, UserMetricsHandler];

@Module({
   imports: [UserAdaptersModule],
   providers: [...USER_SPECIFICATIONS, ...USER_EVENT_HANDLERS],
   exports: [...USER_SPECIFICATIONS, ...USER_EVENT_HANDLERS],
})
export class UserDomainModule {}
