import { BadRequestException, ConflictException, NotFoundException } from '@common';
import { USER_ERROR_CODES } from '@contracts/user';
import { FOLLOW_FIELDS, FOLLOW_OPERATIONS } from '@user/constants';
import { FollowEntity, FollowStatus, UserEntity, UserStatus } from '@user/entities';
import {
   CannotFollowSelfSpecification,
   FollowRequestPendingSpecification,
   UserActiveSpecification,
} from '@user/domain/specifications';
import {
   FollowValidationPipeline,
   FollowSelfValidationHandler,
   FollowUserResolutionHandler,
   FollowRelationshipHandler,
   FollowRequestStatusHandler,
   type FollowValidationContext,
} from '@user/chains/follow-validation';
import {
   createFollowPairParams,
   createFollowIdParams,
   createMissingFieldParams,
} from '@user/chains/follow-validation/follow-validation.helper';

describe('FollowValidationPipeline & Chain Handlers', () => {
   const mockFollower = new UserEntity({
      userId: 'follower-1',
      accountId: 'acc-1',
      username: 'follower',
      status: UserStatus.ACTIVE,
      isPrivate: false,
   });

   const mockFollowing = new UserEntity({
      userId: 'following-1',
      accountId: 'acc-2',
      username: 'following',
      status: UserStatus.ACTIVE,
      isPrivate: false,
   });

   const mockPrivateFollowing = new UserEntity({
      userId: 'following-priv',
      accountId: 'acc-3',
      username: 'following_priv',
      status: UserStatus.ACTIVE,
      isPrivate: true,
   });

   const mockFollowEntity = new FollowEntity({
      followId: 'f-123',
      followerId: 'follower-1',
      followingId: 'following-1',
      status: FollowStatus.ACCEPTED,
   });

   const mockPendingFollowEntity = new FollowEntity({
      followId: 'f-456',
      followerId: 'follower-1',
      followingId: 'following-priv',
      status: FollowStatus.PENDING,
   });

   describe('FollowSelfValidationHandler', () => {
      let handler: FollowSelfValidationHandler;
      let cannotFollowSelfSpec: CannotFollowSelfSpecification;

      beforeEach(() => {
         cannotFollowSelfSpec = new CannotFollowSelfSpecification();
         handler = new FollowSelfValidationHandler(cannotFollowSelfSpec);
      });

      it('should throw BadRequestException if followerId or followingId is missing on FOLLOW', async () => {
         const context: FollowValidationContext = {
            operation: FOLLOW_OPERATIONS.FOLLOW,
            followerId: 'u1',
         };

         await expect(handler.handle(context)).rejects.toThrow(BadRequestException);
         await expect(handler.handle(context)).rejects.toMatchObject({
            response: expect.objectContaining({
               errorCode: USER_ERROR_CODES.USER_ID_REQUIRED,
               params: createMissingFieldParams(FOLLOW_FIELDS.FOLLOWING_ID),
            }),
         });
      });

      it('should throw BadRequestException if user tries to follow themselves', async () => {
         const context: FollowValidationContext = {
            operation: FOLLOW_OPERATIONS.FOLLOW,
            followerId: 'u1',
            followingId: 'u1',
         };

         await expect(handler.handle(context)).rejects.toThrow(BadRequestException);
         await expect(handler.handle(context)).rejects.toMatchObject({
            response: expect.objectContaining({
               errorCode: USER_ERROR_CODES.CANNOT_FOLLOW_YOURSELF,
               params: createFollowPairParams('u1', 'u1'),
            }),
         });
      });

      it('should pass and delegate if follower and following are distinct', async () => {
         const context: FollowValidationContext = {
            operation: FOLLOW_OPERATIONS.FOLLOW,
            followerId: 'u1',
            followingId: 'u2',
         };

         await expect(handler.handle(context)).resolves.toBeUndefined();
      });

      it('should skip validation for ACCEPT_REQUEST operation', async () => {
         const context: FollowValidationContext = {
            operation: FOLLOW_OPERATIONS.ACCEPT_REQUEST,
            followId: 'f-123',
         };

         await expect(handler.handle(context)).resolves.toBeUndefined();
      });
   });

   describe('FollowUserResolutionHandler', () => {
      let handler: FollowUserResolutionHandler;
      let mockUserResolverService: { resolveUser: jest.Mock };
      let userActiveSpec: UserActiveSpecification;

      beforeEach(() => {
         mockUserResolverService = {
            resolveUser: jest.fn().mockImplementation((userId: string) => {
               if (userId === 'follower-1') return Promise.resolve(mockFollower);
               if (userId === 'following-1') return Promise.resolve(mockFollowing);
               return Promise.reject(new NotFoundException(USER_ERROR_CODES.USER_NOT_FOUND));
            }),
         };
         userActiveSpec = new UserActiveSpecification();
         handler = new FollowUserResolutionHandler(mockUserResolverService as any, userActiveSpec);
      });

      it('should resolve both users and enrich context on FOLLOW', async () => {
         const context: FollowValidationContext = {
            operation: FOLLOW_OPERATIONS.FOLLOW,
            followerId: 'follower-1',
            followingId: 'following-1',
         };

         await handler.handle(context);

         expect(context.follower).toBe(mockFollower);
         expect(context.following).toBe(mockFollowing);
      });

      it('should throw BadRequestException if follower is inactive or suspended', async () => {
         const suspendedFollower = new UserEntity({
            userId: 'follower-susp',
            accountId: 'acc-susp',
            status: UserStatus.SUSPENDED,
         });
         mockUserResolverService.resolveUser.mockImplementationOnce(() => Promise.resolve(suspendedFollower));

         const context: FollowValidationContext = {
            operation: FOLLOW_OPERATIONS.FOLLOW,
            followerId: 'follower-susp',
            followingId: 'following-1',
         };

         await expect(handler.handle(context)).rejects.toThrow(BadRequestException);
         await expect(handler.handle(context)).rejects.toMatchObject({
            response: expect.objectContaining({
               errorCode: USER_ERROR_CODES.USER_NOT_ACTIVE,
            }),
         });
      });

      it('should throw BadRequestException if target following user is inactive', async () => {
         const suspendedFollowing = new UserEntity({
            userId: 'following-susp',
            accountId: 'acc-susp2',
            status: UserStatus.SUSPENDED,
         });
         mockUserResolverService.resolveUser
            .mockImplementationOnce(() => Promise.resolve(mockFollower))
            .mockImplementationOnce(() => Promise.resolve(suspendedFollowing));

         const context: FollowValidationContext = {
            operation: FOLLOW_OPERATIONS.FOLLOW,
            followerId: 'follower-1',
            followingId: 'following-susp',
         };

         await expect(handler.handle(context)).rejects.toThrow(BadRequestException);
         await expect(handler.handle(context)).rejects.toMatchObject({
            response: expect.objectContaining({
               errorCode: USER_ERROR_CODES.USER_NOT_ACTIVE,
            }),
         });
      });
   });

   describe('FollowRelationshipHandler', () => {
      let handler: FollowRelationshipHandler;
      let mockFollowRepository: { findByFollowerAndFollowing: jest.Mock };
      let mockGraphFollowRepository: { findFollow: jest.Mock };

      beforeEach(() => {
         mockFollowRepository = {
            findByFollowerAndFollowing: jest.fn(),
         };
         mockGraphFollowRepository = {
            findFollow: jest.fn(),
         };
         handler = new FollowRelationshipHandler(mockFollowRepository as any, mockGraphFollowRepository as any);
      });

      it('should throw ConflictException if follow relationship already exists in graph on FOLLOW', async () => {
         mockGraphFollowRepository.findFollow.mockResolvedValue({
            followerId: 'follower-1',
            followingId: 'following-1',
         });

         const context: FollowValidationContext = {
            operation: FOLLOW_OPERATIONS.FOLLOW,
            followerId: 'follower-1',
            followingId: 'following-1',
            follower: mockFollower,
            following: mockFollowing,
         };

         await expect(handler.handle(context)).rejects.toThrow(ConflictException);
         await expect(handler.handle(context)).rejects.toMatchObject({
            response: expect.objectContaining({
               errorCode: USER_ERROR_CODES.ALREADY_FOLLOWING,
               params: createFollowPairParams('follower-1', 'following-1'),
            }),
         });
      });

      it('should determine status as ACCEPTED for public target user', async () => {
         mockGraphFollowRepository.findFollow.mockResolvedValueOnce(null);

         const context: FollowValidationContext = {
            operation: FOLLOW_OPERATIONS.FOLLOW,
            followerId: 'follower-1',
            followingId: 'following-1',
            follower: mockFollower,
            following: mockFollowing,
         };

         await handler.handle(context);

         expect(context.status).toBe(FollowStatus.ACCEPTED);
      });

      it('should determine status as PENDING for private target user', async () => {
         mockGraphFollowRepository.findFollow.mockResolvedValueOnce(null);

         const context: FollowValidationContext = {
            operation: FOLLOW_OPERATIONS.FOLLOW,
            followerId: 'follower-1',
            followingId: 'following-priv',
            follower: mockFollower,
            following: mockPrivateFollowing,
         };

         await handler.handle(context);

         expect(context.status).toBe(FollowStatus.PENDING);
      });

      it('should throw NotFoundException if follow not found on UNFOLLOW', async () => {
         mockFollowRepository.findByFollowerAndFollowing.mockResolvedValue(null);

         const context: FollowValidationContext = {
            operation: FOLLOW_OPERATIONS.UNFOLLOW,
            followerId: 'follower-1',
            followingId: 'following-1',
            follower: mockFollower,
            following: mockFollowing,
         };

         await expect(handler.handle(context)).rejects.toThrow(NotFoundException);
         await expect(handler.handle(context)).rejects.toMatchObject({
            response: expect.objectContaining({
               errorCode: USER_ERROR_CODES.FOLLOW_NOT_FOUND,
               params: createFollowPairParams('follower-1', 'following-1'),
            }),
         });
      });

      it('should enrich context with existing follow entity on UNFOLLOW', async () => {
         mockFollowRepository.findByFollowerAndFollowing.mockResolvedValue(mockFollowEntity);

         const context: FollowValidationContext = {
            operation: FOLLOW_OPERATIONS.UNFOLLOW,
            followerId: 'follower-1',
            followingId: 'following-1',
            follower: mockFollower,
            following: mockFollowing,
         };

         await handler.handle(context);

         expect(context.follow).toBe(mockFollowEntity);
      });
   });

   describe('FollowRequestStatusHandler', () => {
      let handler: FollowRequestStatusHandler;
      let mockFollowRepository: { findById: jest.Mock };
      let followRequestPendingSpec: FollowRequestPendingSpecification;

      beforeEach(() => {
         mockFollowRepository = {
            findById: jest.fn(),
         };
         followRequestPendingSpec = new FollowRequestPendingSpecification();
         handler = new FollowRequestStatusHandler(mockFollowRepository as any, followRequestPendingSpec);
      });

      it('should throw BadRequestException if followId is missing on ACCEPT_REQUEST', async () => {
         const context: FollowValidationContext = {
            operation: FOLLOW_OPERATIONS.ACCEPT_REQUEST,
         };

         await expect(handler.handle(context)).rejects.toThrow(BadRequestException);
         await expect(handler.handle(context)).rejects.toMatchObject({
            response: expect.objectContaining({
               errorCode: USER_ERROR_CODES.USER_ID_REQUIRED,
               params: createMissingFieldParams(FOLLOW_FIELDS.FOLLOW_ID),
            }),
         });
      });

      it('should throw NotFoundException if follow entity is not found by ID', async () => {
         mockFollowRepository.findById.mockResolvedValue(null);

         const context: FollowValidationContext = {
            operation: FOLLOW_OPERATIONS.ACCEPT_REQUEST,
            followId: 'f-unknown',
         };

         await expect(handler.handle(context)).rejects.toThrow(NotFoundException);
         await expect(handler.handle(context)).rejects.toMatchObject({
            response: expect.objectContaining({
               errorCode: USER_ERROR_CODES.FOLLOW_NOT_FOUND,
               params: createFollowIdParams('f-unknown'),
            }),
         });
      });

      it('should throw BadRequestException if follow request is already ACCEPTED on ACCEPT_REQUEST', async () => {
         mockFollowRepository.findById.mockResolvedValue(mockFollowEntity);

         const context: FollowValidationContext = {
            operation: FOLLOW_OPERATIONS.ACCEPT_REQUEST,
            followId: 'f-123',
         };

         await expect(handler.handle(context)).rejects.toThrow(BadRequestException);
         await expect(handler.handle(context)).rejects.toMatchObject({
            response: expect.objectContaining({
               errorCode: USER_ERROR_CODES.ALREADY_FOLLOWING,
               params: createFollowIdParams('f-123'),
            }),
         });
      });

      it('should succeed on ACCEPT_REQUEST when follow request is pending', async () => {
         mockFollowRepository.findById.mockResolvedValueOnce(mockPendingFollowEntity);

         const context: FollowValidationContext = {
            operation: FOLLOW_OPERATIONS.ACCEPT_REQUEST,
            followId: 'f-456',
         };

         await handler.handle(context);

         expect(context.follow).toBe(mockPendingFollowEntity);
      });

      it('should succeed on REJECT_REQUEST when follow request exists', async () => {
         mockFollowRepository.findById.mockResolvedValueOnce(mockPendingFollowEntity);

         const context: FollowValidationContext = {
            operation: FOLLOW_OPERATIONS.REJECT_REQUEST,
            followId: 'f-456',
         };

         await handler.handle(context);

         expect(context.follow).toBe(mockPendingFollowEntity);
      });
   });

   describe('FollowValidationPipeline (Full Integration)', () => {
      let pipeline: FollowValidationPipeline;
      let mockUserResolverService: { resolveUser: jest.Mock };
      let mockFollowRepository: { findById: jest.Mock; findByFollowerAndFollowing: jest.Mock };
      let mockGraphFollowRepository: { findFollow: jest.Mock };

      beforeEach(() => {
         mockUserResolverService = {
            resolveUser: jest.fn().mockImplementation((userId: string) => {
               if (userId === 'follower-1') return Promise.resolve(mockFollower);
               if (userId === 'following-1') return Promise.resolve(mockFollowing);
               if (userId === 'following-priv') return Promise.resolve(mockPrivateFollowing);
               return Promise.reject(new NotFoundException(USER_ERROR_CODES.USER_NOT_FOUND));
            }),
         };
         mockFollowRepository = {
            findById: jest.fn(),
            findByFollowerAndFollowing: jest.fn(),
         };
         mockGraphFollowRepository = {
            findFollow: jest.fn().mockResolvedValue(null),
         };

         pipeline = new FollowValidationPipeline([
            new FollowSelfValidationHandler(),
            new FollowUserResolutionHandler(mockUserResolverService as any),
            new FollowRelationshipHandler(mockFollowRepository as any, mockGraphFollowRepository as any),
            new FollowRequestStatusHandler(mockFollowRepository as any),
         ]);
      });

      it('should validate complete follow workflow successfully', async () => {
         const context: FollowValidationContext = {
            operation: FOLLOW_OPERATIONS.FOLLOW,
            followerId: 'follower-1',
            followingId: 'following-1',
         };

         await pipeline.validate(context);

         expect(context.follower).toBe(mockFollower);
         expect(context.following).toBe(mockFollowing);
         expect(context.status).toBe(FollowStatus.ACCEPTED);
      });

      it('should validate unfollow workflow successfully', async () => {
         mockFollowRepository.findByFollowerAndFollowing.mockResolvedValueOnce(mockFollowEntity);

         const context: FollowValidationContext = {
            operation: FOLLOW_OPERATIONS.UNFOLLOW,
            followerId: 'follower-1',
            followingId: 'following-1',
         };

         await pipeline.validate(context);

         expect(context.follower).toBe(mockFollower);
         expect(context.following).toBe(mockFollowing);
         expect(context.follow).toBe(mockFollowEntity);
      });

      it('should validate accept follow request workflow successfully', async () => {
         mockFollowRepository.findById.mockResolvedValueOnce(mockPendingFollowEntity);

         const context: FollowValidationContext = {
            operation: FOLLOW_OPERATIONS.ACCEPT_REQUEST,
            followId: 'f-456',
         };

         await pipeline.validate(context);

         expect(context.follow).toBe(mockPendingFollowEntity);
      });

      it('should validate reject follow request workflow successfully', async () => {
         mockFollowRepository.findById.mockResolvedValueOnce(mockPendingFollowEntity);

         const context: FollowValidationContext = {
            operation: FOLLOW_OPERATIONS.REJECT_REQUEST,
            followId: 'f-456',
         };

         await pipeline.validate(context);

         expect(context.follow).toBe(mockPendingFollowEntity);
      });
   });
});
