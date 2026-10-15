import { USER_ERROR_CODES } from '@contracts/user';
import { UserStatus, FollowStatus } from '@user/core/database/entities';
import {
   CannotFollowSelfSpecification,
   FollowRequestPendingSpecification,
   UserActiveSpecification,
   FollowOwnershipSpecification,
   UserCanFollowSpecification,
} from '@user/domain/specifications';

describe('User Domain Specifications', () => {
   describe('CannotFollowSelfSpecification', () => {
      const spec = new CannotFollowSelfSpecification();

      it('should be satisfied when followerId is different from followingId', () => {
         expect(spec.isSatisfiedBy({ followerId: 'user-1', followingId: 'user-2' })).toBe(true);
         expect(spec.validate({ followerId: 'user-1', followingId: 'user-2' }).isSuccess()).toBe(true);
      });

      it('should fail when followerId is identical to followingId', () => {
         expect(spec.isSatisfiedBy({ followerId: 'user-1', followingId: 'user-1' })).toBe(false);
         const res = spec.validate({ followerId: 'user-1', followingId: 'user-1' });
         expect(res.isFailure()).toBe(true);
         expect(res.getError()).toBe(USER_ERROR_CODES.CANNOT_FOLLOW_YOURSELF);
      });
   });

   describe('FollowRequestPendingSpecification', () => {
      const spec = new FollowRequestPendingSpecification();

      it('should be satisfied when status is PENDING', () => {
         expect(spec.isSatisfiedBy({ status: FollowStatus.PENDING })).toBe(true);
         expect(spec.validate({ status: FollowStatus.PENDING }).isSuccess()).toBe(true);
      });

      it('should fail when status is ACCEPTED or REJECTED', () => {
         expect(spec.isSatisfiedBy({ status: FollowStatus.ACCEPTED })).toBe(false);
         const res = spec.validate({ status: FollowStatus.ACCEPTED });
         expect(res.isFailure()).toBe(true);
         expect(res.getError()).toBe(USER_ERROR_CODES.FOLLOW_REQUEST_NOT_PENDING);
      });
   });

   describe('UserActiveSpecification', () => {
      const spec = new UserActiveSpecification();

      it('should be satisfied when user is ACTIVE and not deleted', () => {
         expect(spec.isSatisfiedBy({ status: UserStatus.ACTIVE, deletedAt: null })).toBe(true);
         expect(spec.validate({ status: UserStatus.ACTIVE, deletedAt: null }).isSuccess()).toBe(true);
      });

      it('should fail when deletedAt is set', () => {
         expect(spec.isSatisfiedBy({ status: UserStatus.ACTIVE, deletedAt: new Date() })).toBe(false);
         const res = spec.validate({ status: UserStatus.ACTIVE, deletedAt: new Date() });
         expect(res.isFailure()).toBe(true);
         expect(res.getError()).toBe(USER_ERROR_CODES.USER_NOT_FOUND);
      });

      it('should fail when status is BLOCKED or SUSPENDED', () => {
         expect(spec.isSatisfiedBy({ status: UserStatus.BLOCKED })).toBe(false);
         expect(spec.isSatisfiedBy({ status: UserStatus.SUSPENDED })).toBe(false);
      });
   });

   describe('FollowOwnershipSpecification', () => {
      const spec = new FollowOwnershipSpecification();

      it('should be satisfied when targetUserId matches followingId', () => {
         expect(spec.isSatisfiedBy({ targetUserId: 'user-target', followingId: 'user-target' })).toBe(true);
         expect(spec.validate({ targetUserId: 'user-target', followingId: 'user-target' }).isSuccess()).toBe(true);
      });

      it('should fail when targetUserId does not match followingId', () => {
         expect(spec.isSatisfiedBy({ targetUserId: 'intruder', followingId: 'user-target' })).toBe(false);
         const res = spec.validate({ targetUserId: 'intruder', followingId: 'user-target' });
         expect(res.isFailure()).toBe(true);
         expect(res.getError()).toBe(USER_ERROR_CODES.FOLLOW_REQUEST_NOT_FOUND);
      });
   });

   describe('UserCanFollowSpecification (Composite)', () => {
      const spec = new UserCanFollowSpecification();

      it('should be satisfied when all conditions are met', () => {
         const candidate = {
            followerId: 'user-1',
            followingId: 'user-2',
            followerStatus: UserStatus.ACTIVE,
            followerDeletedAt: null,
            followingStatus: UserStatus.ACTIVE,
            followingDeletedAt: null,
         };
         expect(spec.isSatisfiedBy(candidate)).toBe(true);
         expect(spec.validate(candidate).isSuccess()).toBe(true);
      });

      it('should fail if user tries to follow themselves', () => {
         const candidate = {
            followerId: 'user-1',
            followingId: 'user-1',
            followerStatus: UserStatus.ACTIVE,
            followingStatus: UserStatus.ACTIVE,
         };
         expect(spec.isSatisfiedBy(candidate)).toBe(false);
         const res = spec.validate(candidate);
         expect(res.isFailure()).toBe(true);
         expect(res.getError()).toBe(USER_ERROR_CODES.CANNOT_FOLLOW_YOURSELF);
      });

      it('should fail if target user is deleted or blocked', () => {
         const candidate = {
            followerId: 'user-1',
            followingId: 'user-2',
            followerStatus: UserStatus.ACTIVE,
            followingStatus: UserStatus.BLOCKED,
         };
         expect(spec.isSatisfiedBy(candidate)).toBe(false);
         const res = spec.validate(candidate);
         expect(res.isFailure()).toBe(true);
         expect(res.getError()).toBe(USER_ERROR_CODES.USER_NOT_FOUND);
      });
   });
});
