/**
 * Type-safe operation types for follow validation pipeline adhering to zero hardcoding rules.
 */
export const FOLLOW_OPERATIONS = {
   FOLLOW: 'FOLLOW',
   UNFOLLOW: 'UNFOLLOW',
   ACCEPT_REQUEST: 'ACCEPT_REQUEST',
   REJECT_REQUEST: 'REJECT_REQUEST',
} as const;

export type FollowOperation = (typeof FOLLOW_OPERATIONS)[keyof typeof FOLLOW_OPERATIONS];

/**
 * Type-safe field names for follow operations, validation contexts, and error parameter payloads.
 */
export const FOLLOW_FIELDS = {
   FOLLOWER_ID: 'followerId',
   FOLLOWING_ID: 'followingId',
   FOLLOW_ID: 'followId',
   STATUS: 'status',
   OPTIONS: 'options',
   MISSING_FIELD: 'missingField',
   FIELD: 'field',
} as const;

export type FollowField = (typeof FOLLOW_FIELDS)[keyof typeof FOLLOW_FIELDS];
