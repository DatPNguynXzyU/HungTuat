export * from '@user/commands/follow/follow-user.command';
export * from '@user/commands/follow/follow-user.handler';
export * from '@user/commands/follow/unfollow-user.command';
export * from '@user/commands/follow/unfollow-user.handler';
export * from '@user/commands/follow/accept-follow-request.command';
export * from '@user/commands/follow/accept-follow-request.handler';
export * from '@user/commands/follow/reject-follow-request.command';
export * from '@user/commands/follow/reject-follow-request.handler';
export * from '@user/commands/follow/get-followers.command';
export * from '@user/commands/follow/get-followers.handler';
export * from '@user/commands/follow/get-following.command';
export * from '@user/commands/follow/get-following.handler';
export * from '@user/commands/follow/get-followers-count.command';
export * from '@user/commands/follow/get-followers-count.handler';
export * from '@user/commands/follow/get-following-count.command';
export * from '@user/commands/follow/get-following-count.handler';
export * from '@user/commands/follow/get-mutual-followers.command';
export * from '@user/commands/follow/get-mutual-followers.handler';
export * from '@user/commands/follow/get-follow-suggestions.command';
export * from '@user/commands/follow/get-follow-suggestions.handler';
export * from '@user/commands/follow/check-is-following.command';
export * from '@user/commands/follow/check-is-following.handler';

import { FollowUserHandler } from '@user/commands/follow/follow-user.handler';
import { UnfollowUserHandler } from '@user/commands/follow/unfollow-user.handler';
import { AcceptFollowRequestHandler } from '@user/commands/follow/accept-follow-request.handler';
import { RejectFollowRequestHandler } from '@user/commands/follow/reject-follow-request.handler';
import { GetFollowersHandler } from '@user/commands/follow/get-followers.handler';
import { GetFollowingHandler } from '@user/commands/follow/get-following.handler';
import { GetFollowersCountHandler } from '@user/commands/follow/get-followers-count.handler';
import { GetFollowingCountHandler } from '@user/commands/follow/get-following-count.handler';
import { GetMutualFollowersHandler } from '@user/commands/follow/get-mutual-followers.handler';
import { GetFollowSuggestionsHandler } from '@user/commands/follow/get-follow-suggestions.handler';
import { CheckIsFollowingHandler } from '@user/commands/follow/check-is-following.handler';

export const USER_FOLLOW_COMMAND_HANDLERS = [
   FollowUserHandler,
   UnfollowUserHandler,
   AcceptFollowRequestHandler,
   RejectFollowRequestHandler,
   GetFollowersHandler,
   GetFollowingHandler,
   GetFollowersCountHandler,
   GetFollowingCountHandler,
   GetMutualFollowersHandler,
   GetFollowSuggestionsHandler,
   CheckIsFollowingHandler,
];
