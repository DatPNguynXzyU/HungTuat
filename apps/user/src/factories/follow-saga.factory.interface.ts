import type { FollowSagaType } from '@user/constants';
import type {
   FollowUserSaga,
   UnfollowUserSaga,
   AcceptFollowRequestSaga,
   RejectFollowRequestSaga,
} from '@user/sagas/follow';

export interface IFollowSagaFactory {
   createFollowUserSaga(): FollowUserSaga;
   createUnfollowUserSaga(): UnfollowUserSaga;
   createAcceptFollowRequestSaga(): AcceptFollowRequestSaga;
   createRejectFollowRequestSaga(): RejectFollowRequestSaga;
   createSaga<T = unknown>(type: FollowSagaType): T;
}
