import type { AppendUserEventDto } from '@user/cqrs/write/user-event.interface';
import type {
   UserCreatedEvent,
   UserUpdatedEvent,
   UserDeletedEvent,
   UserRestoredEvent,
   UsernameChangedEvent,
   UserFollowedEvent,
   UserUnfollowedEvent,
   FollowRequestAcceptedEvent,
   FollowRequestRejectedEvent,
   AvatarUploadedEvent,
} from '@user/domain/events';

export const USER_CQRS_EVENT_FACTORY = 'USER_CQRS_EVENT_FACTORY';

export interface IUserCqrsEventFactory {
   createUserStreamId(userId: string): string;
   createFollowStreamId(followerId: string, followingId: string): string;
   fromUserCreated(event: UserCreatedEvent): AppendUserEventDto;
   fromUserUpdated(event: UserUpdatedEvent): AppendUserEventDto;
   fromUserDeleted(event: UserDeletedEvent): AppendUserEventDto;
   fromUserRestored(event: UserRestoredEvent): AppendUserEventDto;
   fromUsernameChanged(event: UsernameChangedEvent): AppendUserEventDto;
   fromUserFollowed(event: UserFollowedEvent): AppendUserEventDto;
   fromUserUnfollowed(event: UserUnfollowedEvent): AppendUserEventDto;
   fromFollowRequestAccepted(event: FollowRequestAcceptedEvent): AppendUserEventDto;
   fromFollowRequestRejected(event: FollowRequestRejectedEvent): AppendUserEventDto;
   fromAvatarUploaded(event: AvatarUploadedEvent): AppendUserEventDto;
}
