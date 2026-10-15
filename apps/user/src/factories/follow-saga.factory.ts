import { Inject, Injectable, Optional } from '@nestjs/common';
import { BadRequestException, COMMON_ERROR_CODES, RetryQueueService } from '@common';
import { FOLLOW_SAGA_TYPES, type FollowSagaType } from '@user/constants';
import { GRAPH_FOLLOW_REPOSITORY, type IFollowGraphRepository } from '@user/modules/follow/repositories';
import { UNIT_OF_WORK, type IUnitOfWork } from '@user/unit-of-work';
import { FollowUserSaga, UnfollowUserSaga, AcceptFollowRequestSaga, RejectFollowRequestSaga } from '@user/sagas/follow';
import type { IFollowSagaFactory } from '@user/factories/follow-saga.factory.interface';

/**
 * Factory responsible for encapsulating the instantiation of dual-write follow sagas.
 * Eliminates direct operator new instantiation and isolates infrastructure dependencies.
 */
@Injectable()
export class FollowSagaFactory implements IFollowSagaFactory {
   constructor(
      @Inject(UNIT_OF_WORK)
      private readonly unitOfWork: IUnitOfWork,
      @Inject(GRAPH_FOLLOW_REPOSITORY)
      private readonly graphFollowRepository: IFollowGraphRepository,
      @Optional()
      private readonly retryQueueService?: RetryQueueService,
   ) {}

   createFollowUserSaga(): FollowUserSaga {
      return new FollowUserSaga(this.unitOfWork, this.graphFollowRepository, this.retryQueueService);
   }

   createUnfollowUserSaga(): UnfollowUserSaga {
      return new UnfollowUserSaga(this.unitOfWork, this.graphFollowRepository, this.retryQueueService);
   }

   createAcceptFollowRequestSaga(): AcceptFollowRequestSaga {
      return new AcceptFollowRequestSaga(this.unitOfWork, this.graphFollowRepository, this.retryQueueService);
   }

   createRejectFollowRequestSaga(): RejectFollowRequestSaga {
      return new RejectFollowRequestSaga(this.unitOfWork, this.graphFollowRepository, this.retryQueueService);
   }

   createSaga<T = unknown>(type: FollowSagaType): T {
      switch (type) {
         case FOLLOW_SAGA_TYPES.FOLLOW_USER:
            return this.createFollowUserSaga() as unknown as T;
         case FOLLOW_SAGA_TYPES.UNFOLLOW_USER:
            return this.createUnfollowUserSaga() as unknown as T;
         case FOLLOW_SAGA_TYPES.ACCEPT_FOLLOW:
            return this.createAcceptFollowRequestSaga() as unknown as T;
         case FOLLOW_SAGA_TYPES.REJECT_FOLLOW:
            return this.createRejectFollowRequestSaga() as unknown as T;
         default:
            throw new BadRequestException(COMMON_ERROR_CODES.INVALID_REQUEST, {
               params: { type },
            });
      }
   }
}
