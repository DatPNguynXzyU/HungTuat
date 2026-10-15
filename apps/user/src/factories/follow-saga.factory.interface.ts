import type { FollowSagaType } from '@user/constants';
import type {
   FollowUserSaga,
   UnfollowUserSaga,
   AcceptFollowRequestSaga,
   RejectFollowRequestSaga,
} from '@user/sagas/follow';

export const FOLLOW_SAGA_FACTORY = 'FOLLOW_SAGA_FACTORY';

export interface IFollowSagaFactory {
   createFollowUserSaga(): FollowUserSaga;
   createUnfollowUserSaga(): UnfollowUserSaga;
   createAcceptFollowRequestSaga(): AcceptFollowRequestSaga;
   createRejectFollowRequestSaga(): RejectFollowRequestSaga;
   createSaga<T = unknown>(type: FollowSagaType): T;
}
