export const USER_CQRS_EVENTS = {
   EVENT_APPENDED: 'user.event.appended',
} as const;

export type UserCqrsEvent = (typeof USER_CQRS_EVENTS)[keyof typeof USER_CQRS_EVENTS];

export const USER_EVENT_STORE = 'USER_EVENT_STORE';
export const USER_STATS_PROJECTION = 'USER_STATS_PROJECTION';
export const USER_PROFILE_PROJECTION = 'USER_PROFILE_PROJECTION';
export const USER_ACTIVITY_PROJECTION = 'USER_ACTIVITY_PROJECTION';
export const USER_PROJECTION_REBUILD_SERVICE = 'USER_PROJECTION_REBUILD_SERVICE';

export const USER_STREAM_PREFIXES = {
   USER: 'user',
   FOLLOW: 'follow',
} as const;

export type UserStreamPrefix = (typeof USER_STREAM_PREFIXES)[keyof typeof USER_STREAM_PREFIXES];

export const CQRS_DEFAULTS = {
   DEFAULT_REBUILD_BATCH_SIZE: 100,
   MAX_REBUILD_BATCH_SIZE: 1000,
} as const;

export const USER_CQRS_LOG_MESSAGES = {
   PROJECTION_FAILED: 'Failed to project event into read model',
} as const;

export type UserCqrsLogMessage = (typeof USER_CQRS_LOG_MESSAGES)[keyof typeof USER_CQRS_LOG_MESSAGES];
