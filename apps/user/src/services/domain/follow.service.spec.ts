import { Test, type TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, ConflictException, NotFoundException } from '@common';
import { FollowEntity, FollowStatus, UserEntity } from '@user/core/database/entities';
import { USER_ERROR_CODES } from '@contracts/user';
import { USER_PROFILE_REPOSITORY } from '@user/modules/profile/repositories';
import { FOLLOW_REPOSITORY, GRAPH_FOLLOW_REPOSITORY } from '@user/modules/follow/repositories';
import { UserResolverService } from '@user/services/infrastructure/user-resolver.service';
import { UNIT_OF_WORK } from '@user/unit-of-work';
import { FOLLOW_SAGA_FACTORY, USER_DOMAIN_EVENT_FACTORY, USER_SPECIFICATION_FACTORY } from '@user/constants';
import { FollowService } from '@user/services/domain/follow.service';

describe('FollowService', () => {
   let service: FollowService;

   const mockFollower = new UserEntity({
      userId: 'follower-1',
      accountId: 'acc-1',
      username: 'follower',
      isPrivate: false,
   });

   const mockFollowing = new UserEntity({
      userId: 'following-1',
      accountId: 'acc-2',
      username: 'following',
      isPrivate: false,
   });

   const mockPrivateFollowing = new UserEntity({
      userId: 'following-priv',
      accountId: 'acc-3',
      username: 'following_priv',
      isPrivate: true,
   });

   const mockFollowEntity = new FollowEntity({
      followId: 'f-123',
      followerId: 'follower-1',
      followingId: 'following-1',
      status: FollowStatus.ACCEPTED,
      createdAt: new Date(),
      updatedAt: new Date(),
   });

   const mockPendingFollowEntity = new FollowEntity({
      followId: 'f-456',
      followerId: 'follower-1',
      followingId: 'following-priv',
      status: FollowStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
   });

   const mockFollowUserSaga = {
      execute: jest.fn().mockResolvedValue(mockFollowEntity),
   };

   const mockUnfollowUserSaga = {
      execute: jest.fn().mockResolvedValue(undefined),
   };

   const mockAcceptFollowRequestSaga = {
      execute: jest.fn().mockResolvedValue(mockFollowEntity),
   };

   const mockRejectFollowRequestSaga = {
      execute: jest.fn().mockResolvedValue(mockFollowEntity),
   };

   const mockFollowSagaFactory = {
      createFollowUserSaga: jest.fn().mockReturnValue(mockFollowUserSaga),
      createUnfollowUserSaga: jest.fn().mockReturnValue(mockUnfollowUserSaga),
      createAcceptFollowRequestSaga: jest.fn().mockReturnValue(mockAcceptFollowRequestSaga),
      createRejectFollowRequestSaga: jest.fn().mockReturnValue(mockRejectFollowRequestSaga),
      createSaga: jest.fn(),
   };

   const mockDomainEventFactory = {
      createUserFollowed: jest.fn().mockReturnValue({}),
      createUserUnfollowed: jest.fn().mockReturnValue({}),
      createFollowRequestAccepted: jest.fn().mockReturnValue({}),
      createFollowRequestRejected: jest.fn().mockReturnValue({}),
   };

   const mockSpecificationFactory = {
      createCannotFollowSelfSpecification: jest.fn().mockReturnValue({
         validate: jest.fn().mockReturnValue({
            isFailure: () => false,
            isSuccess: () => true,
            getError: () => '',
            getParams: () => ({}),
         }),
         isSatisfiedBy: () => true,
      }),
      createFollowRequestPendingSpecification: jest.fn().mockReturnValue({
         validate: jest.fn().mockReturnValue({
            isFailure: () => false,
            isSuccess: () => true,
            getError: () => '',
            getParams: () => ({}),
         }),
         isSatisfiedBy: () => true,
      }),
      createUserActiveSpecification: jest.fn(),
      createFollowOwnershipSpecification: jest.fn(),
      createUserCanFollowSpecification: jest.fn(),
   };

   const mockUserProfileRepository = {
      create: jest.fn(),
      update: jest.fn(),
      findByUsername: jest.fn(),
   };

   const mockUserResolverService = {
      resolveUser: jest.fn().mockImplementation((userId: string) => {
         if (userId === 'follower-1') return Promise.resolve(mockFollower);
         if (userId === 'following-1') return Promise.resolve(mockFollowing);
         if (userId === 'following-priv') return Promise.resolve(mockPrivateFollowing);
         throw new NotFoundException(USER_ERROR_CODES.USER_NOT_FOUND, { params: { id: userId } });
      }),
   };

   const mockFollowRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByFollowerAndFollowing: jest.fn(),
   };

   const mockGraphFollowRepository = {
      findFollow: jest.fn().mockResolvedValue(null),
      getFollowers: jest.fn().mockResolvedValue([]),
      getFollowing: jest.fn().mockResolvedValue([]),
      countFollowers: jest.fn().mockResolvedValue(5),
      countFollowing: jest.fn().mockResolvedValue(3),
      getMutualFollowers: jest.fn().mockResolvedValue([]),
      getFollowSuggestions: jest.fn().mockResolvedValue([]),
   };

   const mockUnitOfWork = {
      runInTransaction: jest.fn(),
   };

   const mockEventEmitter = {
      emit: jest.fn(),
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            FollowService,
            { provide: USER_PROFILE_REPOSITORY, useValue: mockUserProfileRepository },
            { provide: UserResolverService, useValue: mockUserResolverService },
            { provide: FOLLOW_REPOSITORY, useValue: mockFollowRepository },
            { provide: GRAPH_FOLLOW_REPOSITORY, useValue: mockGraphFollowRepository },
            { provide: UNIT_OF_WORK, useValue: mockUnitOfWork },
            { provide: EventEmitter2, useValue: mockEventEmitter },
            { provide: FOLLOW_SAGA_FACTORY, useValue: mockFollowSagaFactory },
            { provide: USER_DOMAIN_EVENT_FACTORY, useValue: mockDomainEventFactory },
            { provide: USER_SPECIFICATION_FACTORY, useValue: mockSpecificationFactory },
         ],
      }).compile();

      service = module.get<FollowService>(FollowService);
   });

   it('should be defined', () => {
      expect(service).toBeDefined();
   });

   describe('followUser', () => {
      it('should successfully execute follow user saga and emit event', async () => {
         const result = await service.followUser('follower-1', 'following-1');

         expect(mockFollowSagaFactory.createFollowUserSaga).toHaveBeenCalled();
         expect(mockFollowUserSaga.execute).toHaveBeenCalledWith(
            expect.objectContaining({
               follower: mockFollower,
               following: mockFollowing,
               status: FollowStatus.ACCEPTED,
            }),
         );
         expect(mockDomainEventFactory.createUserFollowed).toHaveBeenCalledWith(
            'f-123',
            'follower-1',
            'following-1',
            FollowStatus.ACCEPTED,
         );
         expect(mockEventEmitter.emit).toHaveBeenCalled();
         expect(result).toBe(mockFollowEntity);
      });

      it('should throw ConflictException if already following', async () => {
         mockGraphFollowRepository.findFollow.mockResolvedValueOnce({
            followerId: 'follower-1',
            followingId: 'following-1',
         });

         await expect(service.followUser('follower-1', 'following-1')).rejects.toThrow(ConflictException);
      });
   });

   describe('unfollowUser', () => {
      it('should successfully execute unfollow user saga and emit event', async () => {
         mockFollowRepository.findByFollowerAndFollowing.mockResolvedValueOnce(mockFollowEntity);

         await service.unfollowUser('follower-1', 'following-1');

         expect(mockFollowSagaFactory.createUnfollowUserSaga).toHaveBeenCalled();
         expect(mockUnfollowUserSaga.execute).toHaveBeenCalledWith(
            expect.objectContaining({
               follower: mockFollower,
               following: mockFollowing,
               follow: mockFollowEntity,
            }),
         );
         expect(mockDomainEventFactory.createUserUnfollowed).toHaveBeenCalledWith('follower-1', 'following-1');
         expect(mockEventEmitter.emit).toHaveBeenCalled();
      });

      it('should throw NotFoundException if follow not found', async () => {
         mockFollowRepository.findByFollowerAndFollowing.mockResolvedValueOnce(null);

         await expect(service.unfollowUser('follower-1', 'following-1')).rejects.toThrow(NotFoundException);
      });
   });

   describe('acceptFollowRequest', () => {
      it('should successfully execute accept follow request saga and emit event', async () => {
         mockFollowRepository.findById.mockResolvedValueOnce(mockPendingFollowEntity);

         const result = await service.acceptFollowRequest('f-456');

         expect(mockFollowSagaFactory.createAcceptFollowRequestSaga).toHaveBeenCalled();
         expect(mockAcceptFollowRequestSaga.execute).toHaveBeenCalledWith(
            expect.objectContaining({ follow: mockPendingFollowEntity }),
         );
         expect(mockDomainEventFactory.createFollowRequestAccepted).toHaveBeenCalledWith(
            'f-456',
            'follower-1',
            'following-priv',
         );
         expect(mockEventEmitter.emit).toHaveBeenCalled();
         expect(result).toBe(mockFollowEntity);
      });

      it('should throw NotFoundException if follow request does not exist', async () => {
         mockFollowRepository.findById.mockResolvedValueOnce(null);

         await expect(service.acceptFollowRequest('f-nonexistent')).rejects.toThrow(NotFoundException);
      });

      it('should throw BadRequestException if already accepted', async () => {
         mockFollowRepository.findById.mockResolvedValueOnce(mockFollowEntity);

         await expect(service.acceptFollowRequest('f-123')).rejects.toThrow(BadRequestException);
      });
   });

   describe('rejectFollowRequest', () => {
      it('should successfully execute reject follow request saga and emit event', async () => {
         mockFollowRepository.findById.mockResolvedValueOnce(mockPendingFollowEntity);

         const result = await service.rejectFollowRequest('f-456');

         expect(mockFollowSagaFactory.createRejectFollowRequestSaga).toHaveBeenCalled();
         expect(mockRejectFollowRequestSaga.execute).toHaveBeenCalledWith(
            expect.objectContaining({ follow: mockPendingFollowEntity }),
         );
         expect(mockDomainEventFactory.createFollowRequestRejected).toHaveBeenCalledWith(
            'f-456',
            'follower-1',
            'following-priv',
         );
         expect(mockEventEmitter.emit).toHaveBeenCalled();
         expect(result).toBe(mockFollowEntity);
      });

      it('should throw NotFoundException if follow request does not exist', async () => {
         mockFollowRepository.findById.mockResolvedValueOnce(null);

         await expect(service.rejectFollowRequest('f-nonexistent')).rejects.toThrow(NotFoundException);
      });
   });
});
