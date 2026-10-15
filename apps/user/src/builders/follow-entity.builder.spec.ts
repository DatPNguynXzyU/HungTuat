import { BadRequestException } from '@common';
import { FollowEntityBuilder } from '@user/builders/follow-entity.builder';
import { FollowStatus } from '@user/entities';

describe('FollowEntityBuilder', () => {
   it('should build a FollowEntity instance with explicit properties', () => {
      const createdAt = new Date('2026-03-01');
      const updatedAt = new Date('2026-03-02');

      const follow = FollowEntityBuilder.create()
         .withFollowId('custom-follow-id')
         .withFollowerId('user-1')
         .withFollowingId('user-2')
         .asAccepted()
         .withTimestamps({ createdAt, updatedAt })
         .build();

      expect(follow.followId).toBe('custom-follow-id');
      expect(follow.followerId).toBe('user-1');
      expect(follow.followingId).toBe('user-2');
      expect(follow.status).toBe(FollowStatus.ACCEPTED);
      expect(follow.createdAt).toBe(createdAt);
      expect(follow.updatedAt).toBe(updatedAt);
   });

   it('should auto-derive followId as followerId-followingId when omitted', () => {
      const follow = FollowEntityBuilder.create()
         .withFollowerId('user-alpha')
         .withFollowingId('user-beta')
         .asPending()
         .build();

      expect(follow.followId).toBe('user-alpha-user-beta');
      expect(follow.status).toBe(FollowStatus.PENDING);
   });

   it('should throw BadRequestException if followerId or followingId are missing', () => {
      expect(() => FollowEntityBuilder.create().withFollowerId('user-1').build()).toThrow(BadRequestException);
      expect(() => FollowEntityBuilder.create().withFollowingId('user-2').build()).toThrow(BadRequestException);
   });

   it('should map from Graph repository result via fromGraphResult()', () => {
      const graphResult = {
         followerId: 'user-g1',
         followingId: 'user-g2',
         status: FollowStatus.ACCEPTED,
         createdAt: new Date('2026-04-01'),
         updatedAt: new Date('2026-04-02'),
      };

      const follow = FollowEntityBuilder.create().fromGraphResult(graphResult).build();

      expect(follow.followId).toBe('user-g1-user-g2');
      expect(follow.followerId).toBe('user-g1');
      expect(follow.followingId).toBe('user-g2');
      expect(follow.status).toBe(FollowStatus.ACCEPTED);
   });

   it('should map from Prisma Follow record via fromPrismaFollow()', () => {
      const prismaFollow = {
         followId: 'f-prisma-1',
         followerId: 'user-p1',
         followingId: 'user-p2',
         status: 'ACCEPTED',
         createdAt: new Date('2026-05-01'),
         updatedAt: new Date('2026-05-02'),
         deletedAt: null,
      };

      const follow = FollowEntityBuilder.create()
         .fromPrismaFollow(prismaFollow as never)
         .build();

      expect(follow.followId).toBe('f-prisma-1');
      expect(follow.followerId).toBe('user-p1');
      expect(follow.followingId).toBe('user-p2');
      expect(follow.status).toBe(FollowStatus.ACCEPTED);
      expect(follow.createdAt).toEqual(new Date('2026-05-01'));
   });
});
