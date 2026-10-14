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
