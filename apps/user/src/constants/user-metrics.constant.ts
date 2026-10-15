export const USER_METRICS_PREFIX = 'user_';

export const USER_METRICS_NAMES = {
   MEDIA_OPERATIONS: 'user_media_operations_total',
   SEARCH_OPERATIONS: 'user_search_operations_total',
   NOTIFICATION_OPERATIONS: 'user_notification_operations_total',
   DOMAIN_OPERATIONS: 'user_domain_operations_total',
   GRAPH_SYNC_OPERATIONS: 'user_graph_sync_operations_total',
   MEDIA_OPERATION_DURATION: 'user_media_operation_duration_seconds',
   SEARCH_OPERATION_DURATION: 'user_search_operation_duration_seconds',
   GRAPH_SYNC_DURATION: 'user_graph_sync_duration_seconds',
   TOTAL_USERS: 'user_total_users',
   TOTAL_FOLLOWS: 'user_total_follows',
} as const;

export const USER_METRICS_HELP = {
   MEDIA_OPERATIONS: 'Total number of media adapter operations',
   SEARCH_OPERATIONS: 'Total number of search adapter operations',
   NOTIFICATION_OPERATIONS: 'Total number of notification adapter operations',
   DOMAIN_OPERATIONS: 'Total number of user domain events/operations',
   GRAPH_SYNC_OPERATIONS: 'Total number of user graph sync operations',
   MEDIA_OPERATION_DURATION: 'Duration of media adapter operations in seconds',
   SEARCH_OPERATION_DURATION: 'Duration of search adapter operations in seconds',
   GRAPH_SYNC_DURATION: 'Duration of graph sync operations in seconds',
   TOTAL_USERS: 'Current total count of registered users in system',
   TOTAL_FOLLOWS: 'Current total count of active follow relationships',
} as const;

export const USER_METRICS_LABELS = {
   STATUS: 'status',
   OPERATION: 'operation',
} as const;

export const USER_METRICS_BUCKETS: {
   readonly MEDIA_DURATION: number[];
   readonly SEARCH_DURATION: number[];
   readonly GRAPH_SYNC_DURATION: number[];
} = {
   // Media operations: 50ms to 10s (network upload & signatures)
   MEDIA_DURATION: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],

   // Search operations: 5ms to 2s (Elasticsearch query & index events)
   SEARCH_DURATION: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2],

   // Graph sync operations: 10ms to 2s (Nebula Graph write & queue)
   GRAPH_SYNC_DURATION: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2],
};

export const USER_METRICS_STATUS = {
   SUCCESS: 'success',
   FAILURE: 'failure',
} as const;
export type UserMetricStatus = (typeof USER_METRICS_STATUS)[keyof typeof USER_METRICS_STATUS];

export const USER_METRICS_MEDIA_OPERATIONS = {
   UPLOAD_AVATAR: 'upload_avatar',
   GET_UPLOAD_SIGNATURE: 'get_upload_signature',
} as const;
export type UserMetricMediaOperation =
   (typeof USER_METRICS_MEDIA_OPERATIONS)[keyof typeof USER_METRICS_MEDIA_OPERATIONS];

export const USER_METRICS_SEARCH_OPERATIONS = {
   SEARCH_USERS: 'search_users',
   INDEX_EVENT: 'index_event',
} as const;
export type UserMetricSearchOperation =
   (typeof USER_METRICS_SEARCH_OPERATIONS)[keyof typeof USER_METRICS_SEARCH_OPERATIONS];

export const USER_METRICS_NOTIFICATION_OPERATIONS = {
   USER_FOLLOWED: 'user_followed',
   FOLLOW_ACCEPTED: 'follow_accepted',
} as const;
export type UserMetricNotificationOperation =
   (typeof USER_METRICS_NOTIFICATION_OPERATIONS)[keyof typeof USER_METRICS_NOTIFICATION_OPERATIONS];

export const USER_METRICS_GRAPH_OPERATIONS = {
   SYNC_USER: 'sync_user',
   SYNC_FOLLOW: 'sync_follow',
   SYNC_UNFOLLOW: 'sync_unfollow',
} as const;
export type UserMetricGraphOperation =
   (typeof USER_METRICS_GRAPH_OPERATIONS)[keyof typeof USER_METRICS_GRAPH_OPERATIONS];

export const USER_METRICS_DOMAIN_OPERATIONS = {
   USER_CREATED: 'user_created',
   USER_UPDATED: 'user_updated',
   USER_DELETED: 'user_deleted',
   USER_RESTORED: 'user_restored',
   USERNAME_CHANGED: 'username_changed',
   USER_FOLLOWED: 'user_followed',
   USER_UNFOLLOWED: 'user_unfollowed',
   FOLLOW_ACCEPTED: 'follow_accepted',
   FOLLOW_REJECTED: 'follow_rejected',
   AVATAR_UPLOADED: 'avatar_uploaded',
} as const;
export type UserMetricDomainOperation =
   (typeof USER_METRICS_DOMAIN_OPERATIONS)[keyof typeof USER_METRICS_DOMAIN_OPERATIONS];

export const USER_METRICS_LOG_MESSAGES = {
   DISPATCH_AVATAR_UPLOAD: 'Dispatching avatar upload via RabbitMQ Media Adapter',
   REQUEST_AVATAR_SIGNATURE: 'Requesting avatar upload signature via RabbitMQ Media Adapter',
   AVATAR_UPLOAD_SUCCESS: 'Avatar upload completed successfully',
   AVATAR_UPLOAD_FAILED: 'Avatar upload failed in Media Adapter',
   AVATAR_SIGNATURE_SUCCESS: 'Avatar upload signature retrieved successfully',
   AVATAR_SIGNATURE_FAILED: 'Failed to retrieve avatar upload signature',

   DISPATCH_SEARCH_QUERY: 'Executing user search query via Search Adapter',
   SEARCH_QUERY_SUCCESS: 'User search query completed successfully',
   SEARCH_QUERY_FAILED: 'Search Service query failed in Search Adapter',
   EMIT_INDEX_EVENT: 'Emitting search index event via Search Adapter',
   EMIT_INDEX_EVENT_FAILED: 'Failed to emit search index event in Search Adapter',

   DISPATCH_FOLLOW_NOTIFICATION: 'Dispatching user followed notification via Notification Adapter',
   DISPATCH_FOLLOW_NOTIFICATION_FAILED: 'Failed to dispatch user followed notification',
   DISPATCH_ACCEPT_NOTIFICATION: 'Dispatching follow accepted notification via Notification Adapter',
   DISPATCH_ACCEPT_NOTIFICATION_FAILED: 'Failed to dispatch follow accepted notification',

   GRAPH_SYNC_USER: 'Syncing user to Nebula Graph via Graph Sync Service',
   GRAPH_SYNC_USER_FAILED: 'Failed to sync user to Nebula Graph',
   GRAPH_SYNC_FOLLOW: 'Syncing follow relationship to Nebula Graph',
   GRAPH_SYNC_FOLLOW_FAILED: 'Failed to sync follow relationship to Nebula Graph',
   GRAPH_SYNC_UNFOLLOW: 'Syncing unfollow relationship to Nebula Graph',
   GRAPH_SYNC_UNFOLLOW_FAILED: 'Failed to sync unfollow relationship to Nebula Graph',
} as const;
