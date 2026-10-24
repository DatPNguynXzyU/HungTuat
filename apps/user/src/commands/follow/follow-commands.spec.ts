import { BadRequestException, DEFAULT_ROLES } from '@common';
import { FollowEntity, FollowStatus } from '@user/entities';
import type { FollowService } from '@user/services/domain/follow.service';
import {
   AcceptFollowRequestCommand,
   AcceptFollowRequestHandler,
   CheckIsFollowingCommand,
   CheckIsFollowingHandler,
   FollowUserCommand,
   FollowUserHandler,
   GetFollowersCommand,
   GetFollowersCountCommand,
   GetFollowersCountHandler,
   GetFollowersHandler,
   GetFollowingCommand,
   GetFollowingCountCommand,
   GetFollowingCountHandler,
   GetFollowingHandler,
   GetFollowSuggestionsCommand,
   GetFollowSuggestionsHandler,
   GetMutualFollowersCommand,
   GetMutualFollowersHandler,
   RejectFollowRequestCommand,
   RejectFollowRequestHandler,
   UnfollowUserCommand,
   UnfollowUserHandler,
} from '@user/commands/follow';
import { FOLLOW_STATUS } from '@contracts/user';

describe('Follow Command Handlers', () => {
   let followService: jest.Mocked<Partial<FollowService>>;

   const mockFollow = new FollowEntity({
      followId: 'f-1',
      followerId: 'user-1',
      followingId: 'user-2',
      status: FollowStatus.ACCEPTED,
   });

   beforeEach(() => {
      followService = {
         followUser: jest.fn().mockResolvedValue(mockFollow),
         unfollowUser: jest.fn().mockResolvedValue(undefined),
         acceptFollowRequest: jest.fn().mockResolvedValue(mockFollow),
         rejectFollowRequest: jest.fn().mockResolvedValue(mockFollow),
         getFollowers: jest.fn().mockResolvedValue([mockFollow]),
         getFollowing: jest.fn().mockResolvedValue([mockFollow]),
         getFollowersCount: jest.fn().mockResolvedValue(42),
         getFollowingCount: jest.fn().mockResolvedValue(10),
         getMutualFollowers: jest.fn().mockResolvedValue(['user-3']),
         checkIsFollowing: jest.fn().mockResolvedValue({ isFollowing: true, status: FollowStatus.ACCEPTED }),
         getFollowSuggestions: jest
            .fn()
            .mockResolvedValue([{ id: 'u-3', username: 'suggested_1', mutualCount: 2, reason: 'MUTUAL_FRIENDS' }]),
      };
   });

   describe('FollowUserHandler', () => {
      it('should follow user with ownership check', async () => {
         const handler = new FollowUserHandler(followService as FollowService);
         const result = await handler.execute(
            new FollowUserCommand({
               data: { followerId: 'user-1', followingId: 'user-2' },
               user: { userId: 'user-1', email: 'test@example.com', roles: [DEFAULT_ROLES.USER], permissions: [] },
            }),
         );

         expect(followService.followUser).toHaveBeenCalledWith('user-1', 'user-2');
         expect(result).toEqual(mockFollow);
      });
   });

   describe('UnfollowUserHandler', () => {
      it('should unfollow user and return success', async () => {
         const handler = new UnfollowUserHandler(followService as FollowService);
         const result = await handler.execute(
            new UnfollowUserCommand({
               data: { followerId: 'user-1', followingId: 'user-2' },
               user: { userId: 'user-1', email: 'test@example.com', roles: [DEFAULT_ROLES.USER], permissions: [] },
            }),
         );

         expect(followService.unfollowUser).toHaveBeenCalledWith('user-1', 'user-2');
         expect(result).toEqual({ success: true });
      });
   });

   describe('AcceptFollowRequestHandler', () => {
      it('should accept follow request', async () => {
         const handler = new AcceptFollowRequestHandler(followService as FollowService);
         const result = await handler.execute(new AcceptFollowRequestCommand('f-1'));

         expect(followService.acceptFollowRequest).toHaveBeenCalledWith('f-1');
         expect(result).toEqual(mockFollow);
      });
   });

   describe('RejectFollowRequestHandler', () => {
      it('should reject follow request', async () => {
         const handler = new RejectFollowRequestHandler(followService as FollowService);
         const result = await handler.execute(new RejectFollowRequestCommand('f-1'));

         expect(followService.rejectFollowRequest).toHaveBeenCalledWith('f-1');
         expect(result).toEqual(mockFollow);
      });
   });

   describe('GetFollowersHandler', () => {
      it('should return followers', async () => {
         const handler = new GetFollowersHandler(followService as FollowService);
         const result = await handler.execute(new GetFollowersCommand('user-1', FollowStatus.ACCEPTED, 0, 10));

         expect(followService.getFollowers).toHaveBeenCalledWith('user-1', FollowStatus.ACCEPTED, 0, 10);
         expect(result).toEqual([mockFollow]);
      });
   });

   describe('GetFollowingHandler', () => {
      it('should return following', async () => {
         const handler = new GetFollowingHandler(followService as FollowService);
         const result = await handler.execute(new GetFollowingCommand('user-1', FollowStatus.ACCEPTED, 0, 10));

         expect(followService.getFollowing).toHaveBeenCalledWith('user-1', FollowStatus.ACCEPTED, 0, 10);
         expect(result).toEqual([mockFollow]);
      });
   });

   describe('GetFollowersCountHandler', () => {
      it('should return followers count wrapped in object', async () => {
         const handler = new GetFollowersCountHandler(followService as FollowService);
         const result = await handler.execute(new GetFollowersCountCommand('user-1'));

         expect(followService.getFollowersCount).toHaveBeenCalledWith('user-1', undefined);
         expect(result).toEqual({ count: 42 });
      });
   });

   describe('GetFollowingCountHandler', () => {
      it('should return following count wrapped in object', async () => {
         const handler = new GetFollowingCountHandler(followService as FollowService);
         const result = await handler.execute(new GetFollowingCountCommand('user-1'));

         expect(followService.getFollowingCount).toHaveBeenCalledWith('user-1', undefined);
         expect(result).toEqual({ count: 10 });
      });
   });

   describe('GetMutualFollowersHandler', () => {
      it('should return mutual followers', async () => {
         const handler = new GetMutualFollowersHandler(followService as FollowService);
         const result = await handler.execute(new GetMutualFollowersCommand('user-1', 'user-2'));

         expect(followService.getMutualFollowers).toHaveBeenCalledWith('user-1', 'user-2');
         expect(result).toEqual(['user-3']);
      });
   });

   describe('GetFollowSuggestionsHandler', () => {
      it('should return suggestions', async () => {
         const handler = new GetFollowSuggestionsHandler(followService as FollowService);
         const result = await handler.execute(new GetFollowSuggestionsCommand('user-1', 5));

         expect(followService.getFollowSuggestions).toHaveBeenCalledWith('user-1', 5);
         expect(result).toHaveLength(1);
      });

      it('should throw BadRequestException if userId is empty', async () => {
         const handler = new GetFollowSuggestionsHandler(followService as FollowService);
         await expect(handler.execute(new GetFollowSuggestionsCommand(''))).rejects.toThrow(BadRequestException);
      });
   });

   describe('CheckIsFollowingHandler', () => {
      it('should return follow check result', async () => {
         const handler = new CheckIsFollowingHandler(followService as FollowService);
         const result = await handler.execute(new CheckIsFollowingCommand('user-1', 'user-2'));

         expect(followService.checkIsFollowing).toHaveBeenCalledWith('user-1', 'user-2');
         expect(result).toEqual({ isFollowing: true, status: FOLLOW_STATUS.ACCEPTED });
      });
   });
});
