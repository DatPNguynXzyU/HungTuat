import { Test, type TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@common';
import { FOLLOW_SAGA_TYPES } from '@user/constants';
import { GRAPH_FOLLOW_REPOSITORY } from '@user/repositories';
import { UNIT_OF_WORK } from '@user/unit-of-work';
import { FollowUserSaga, UnfollowUserSaga, AcceptFollowRequestSaga, RejectFollowRequestSaga } from '@user/sagas/follow';
import { FollowSagaFactory } from '@user/factories/follow-saga.factory';

describe('FollowSagaFactory', () => {
   let factory: FollowSagaFactory;

   const mockUnitOfWork = {
      runInTransaction: jest.fn(),
   };

   const mockGraphFollowRepository = {
      createFollow: jest.fn(),
      deleteFollow: jest.fn(),
      updateFollowStatus: jest.fn(),
   };

   beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
         providers: [
            FollowSagaFactory,
            { provide: UNIT_OF_WORK, useValue: mockUnitOfWork },
            { provide: GRAPH_FOLLOW_REPOSITORY, useValue: mockGraphFollowRepository },
         ],
      }).compile();

      factory = module.get<FollowSagaFactory>(FollowSagaFactory);
   });

   it('should be defined', () => {
      expect(factory).toBeDefined();
   });

   it('should create FollowUserSaga', () => {
      const saga = factory.createFollowUserSaga();
      expect(saga).toBeInstanceOf(FollowUserSaga);
   });

   it('should create UnfollowUserSaga', () => {
      const saga = factory.createUnfollowUserSaga();
      expect(saga).toBeInstanceOf(UnfollowUserSaga);
   });

   it('should create AcceptFollowRequestSaga', () => {
      const saga = factory.createAcceptFollowRequestSaga();
      expect(saga).toBeInstanceOf(AcceptFollowRequestSaga);
   });

   it('should create RejectFollowRequestSaga', () => {
      const saga = factory.createRejectFollowRequestSaga();
      expect(saga).toBeInstanceOf(RejectFollowRequestSaga);
   });

   it('should create sagas using createSaga method', () => {
      expect(factory.createSaga(FOLLOW_SAGA_TYPES.FOLLOW_USER)).toBeInstanceOf(FollowUserSaga);
      expect(factory.createSaga(FOLLOW_SAGA_TYPES.UNFOLLOW_USER)).toBeInstanceOf(UnfollowUserSaga);
      expect(factory.createSaga(FOLLOW_SAGA_TYPES.ACCEPT_FOLLOW)).toBeInstanceOf(AcceptFollowRequestSaga);
      expect(factory.createSaga(FOLLOW_SAGA_TYPES.REJECT_FOLLOW)).toBeInstanceOf(RejectFollowRequestSaga);
   });

   it('should throw BadRequestException when invalid saga type provided', () => {
      expect(() => factory.createSaga('INVALID_TYPE' as never)).toThrow(BadRequestException);
   });
});
