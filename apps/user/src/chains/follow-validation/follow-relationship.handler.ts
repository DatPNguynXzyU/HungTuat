import { Inject, Injectable, Optional } from '@nestjs/common';
import { ConflictException, NotFoundException } from '@common';
import { USER_ERROR_CODES } from '@contracts/user';
import { FOLLOW_OPERATIONS } from '@user/constants';
import { FollowStatus } from '@user/entities';
import { FOLLOW_REPOSITORY, type IFollowRepository } from '@user/repositories/follow.repository.interface';
import {
   GRAPH_FOLLOW_REPOSITORY,
   type IFollowGraphRepository,
} from '@user/repositories/follow-graph.repository.interface';
import { AbstractFollowValidationHandler } from '@user/chains/follow-validation/abstract-follow-validation.handler';
import type { FollowValidationContext } from '@user/chains/follow-validation/follow-validation.context';
import { createFollowPairParams } from '@user/chains/follow-validation/follow-validation.helper';

/**
 * Validates the existence and state of the follow relationship across relational and graph repositories.
 * - For FOLLOW: prevents duplicate followings and determines initial target status (PENDING vs ACCEPTED).
 * - For UNFOLLOW: verifies that an active follow relationship exists to be dissolved.
 */
@Injectable()
export class FollowRelationshipHandler extends AbstractFollowValidationHandler {
   constructor(
      @Optional()
      @Inject(FOLLOW_REPOSITORY)
      private readonly followRepository?: IFollowRepository,
      @Optional()
      @Inject(GRAPH_FOLLOW_REPOSITORY)
      private readonly graphFollowRepository?: IFollowGraphRepository,
   ) {
      super();
   }

   override async handle(context: FollowValidationContext): Promise<void> {
      if (context.operation === FOLLOW_OPERATIONS.FOLLOW) {
         if (this.graphFollowRepository && context.follower && context.following) {
            const existingFollow = await this.graphFollowRepository.findFollow(
               context.follower.userId,
               context.following.userId,
            );

            if (existingFollow) {
               throw new ConflictException(USER_ERROR_CODES.ALREADY_FOLLOWING, {
                  params: createFollowPairParams(
                     context.followerId ?? context.follower.userId,
                     context.followingId ?? context.following.userId,
                  ),
               });
            }
         }

         if (context.following) {
            context.status = context.following.isPrivate ? FollowStatus.PENDING : FollowStatus.ACCEPTED;
         }
      } else if (context.operation === FOLLOW_OPERATIONS.UNFOLLOW) {
         if (this.followRepository && context.follower && context.following) {
            const follow = await this.followRepository.findByFollowerAndFollowing(
               context.follower.userId,
               context.following.userId,
            );

            if (!follow) {
               throw new NotFoundException(USER_ERROR_CODES.FOLLOW_NOT_FOUND, {
                  params: createFollowPairParams(
                     context.followerId ?? context.follower.userId,
                     context.followingId ?? context.following.userId,
                  ),
               });
            }

            context.follow = follow;
         }
      }

      return super.handle(context);
   }
}
