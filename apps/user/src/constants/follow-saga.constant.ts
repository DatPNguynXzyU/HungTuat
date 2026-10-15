export const FOLLOW_SAGA_NAMES = {
   FOLLOW_USER: 'FollowUserSaga',
   UNFOLLOW_USER: 'UnfollowUserSaga',
   ACCEPT_FOLLOW_REQUEST: 'AcceptFollowRequestSaga',
   REJECT_FOLLOW_REQUEST: 'RejectFollowRequestSaga',
} as const;

export type FollowSagaName = (typeof FOLLOW_SAGA_NAMES)[keyof typeof FOLLOW_SAGA_NAMES];

export const FOLLOW_SAGA_STEPS = {
   POSTGRES_FOLLOW_TX: 'PostgresFollowTransaction',
   NEBULA_GRAPH_FOLLOW_SYNC: 'NebulaGraphFollowSync',
   POSTGRES_UNFOLLOW_TX: 'PostgresUnfollowTransaction',
   NEBULA_GRAPH_UNFOLLOW_SYNC: 'NebulaGraphUnfollowSync',
   POSTGRES_ACCEPT_FOLLOW_TX: 'PostgresAcceptFollowTransaction',
   NEBULA_GRAPH_ACCEPT_FOLLOW_SYNC: 'NebulaGraphAcceptFollowSync',
   POSTGRES_REJECT_FOLLOW_TX: 'PostgresRejectFollowTransaction',
   NEBULA_GRAPH_REJECT_FOLLOW_SYNC: 'NebulaGraphRejectFollowSync',
} as const;

export type FollowSagaStep = (typeof FOLLOW_SAGA_STEPS)[keyof typeof FOLLOW_SAGA_STEPS];

export const FOLLOW_SAGA_LOG_MESSAGES = {
   GRAPH_SYNCED: 'Graph synchronized successfully',
   GRAPH_SYNC_FAILED: 'Graph sync failed for follow operation',
   GRAPH_COMPENSATION_FAILED: 'Failed to compensate Graph follow operation',
} as const;

export type FollowSagaLogMessage = (typeof FOLLOW_SAGA_LOG_MESSAGES)[keyof typeof FOLLOW_SAGA_LOG_MESSAGES];

export const FOLLOW_GRAPH_STATUS_KEYS = {
   GRAPH_SYNCED: 'graphSynced',
   GRAPH_DELETED: 'graphDeleted',
   GRAPH_UPDATED: 'graphUpdated',
} as const;

export type FollowGraphStatusKey = (typeof FOLLOW_GRAPH_STATUS_KEYS)[keyof typeof FOLLOW_GRAPH_STATUS_KEYS];
