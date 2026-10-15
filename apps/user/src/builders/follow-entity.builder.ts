import { BadRequestException, type IBuilder } from '@common';
import { FollowEntity, FollowStatus } from '@user/core/database/entities';
import { USER_BUILDER_ERRORS } from '@user/constants';
import type { Follow as PrismaFollow } from '@user/prisma-client';

export interface GraphFollowResultSource {
   followerId: string;
   followingId: string;
   status?: FollowStatus;
   createdAt?: Date;
   updatedAt?: Date;
}

/**
 * Fluent builder for constructing FollowEntity domain instances.
 * Simplifies mapping from graph database projections and relational query results.
 */
export class FollowEntityBuilder implements IBuilder<FollowEntity> {
   private followId?: string;
   private followerId?: string;
   private followingId?: string;
   private status: FollowStatus = FollowStatus.PENDING;
   private createdAt: Date = new Date();
   private updatedAt: Date = new Date();
   private deletedAt: Date | null = null;

   /**
    * Static factory method to instantiate a new FollowEntityBuilder.
    */
   static create(): FollowEntityBuilder {
      return new FollowEntityBuilder();
   }

   /**
    * Sets explicit follow ID.
    */
   withFollowId(followId?: string): this {
      if (followId) {
         this.followId = followId;
      }
      return this;
   }

   /**
    * Sets follower user ID.
    */
   withFollowerId(followerId: string): this {
      this.followerId = followerId;
      return this;
   }

   /**
    * Sets following user ID.
    */
   withFollowingId(followingId: string): this {
      this.followingId = followingId;
      return this;
   }

   /**
    * Sets relationship status.
    */
   withStatus(status: FollowStatus): this {
      this.status = status;
      return this;
   }

   /**
    * Marks relationship as ACCEPTED.
    */
   asAccepted(): this {
      this.status = FollowStatus.ACCEPTED;
      return this;
   }

   /**
    * Marks relationship as PENDING.
    */
   asPending(): this {
      this.status = FollowStatus.PENDING;
      return this;
   }

   /**
    * Marks relationship as REJECTED.
    */
   asRejected(): this {
      this.status = FollowStatus.REJECTED;
      return this;
   }

   /**
    * Sets relationship timestamps.
    */
   withTimestamps(options: { createdAt?: Date; updatedAt?: Date; deletedAt?: Date | null }): this {
      if (options.createdAt !== undefined) this.createdAt = options.createdAt;
      if (options.updatedAt !== undefined) this.updatedAt = options.updatedAt;
      if (options.deletedAt !== undefined) this.deletedAt = options.deletedAt;
      return this;
   }

   /**
    * Maps attributes from a Graph repository query result.
    */
   fromGraphResult(result: GraphFollowResultSource): this {
      this.followerId = result.followerId;
      this.followingId = result.followingId;
      this.followId = `${result.followerId}-${result.followingId}`;
      if (result.status !== undefined) {
         this.status = result.status;
      }
      if (result.createdAt !== undefined) {
         this.createdAt = result.createdAt;
      }
      if (result.updatedAt !== undefined) {
         this.updatedAt = result.updatedAt;
      }
      return this;
   }

   /**
    * Maps attributes from a relational database Prisma query result.
    */
   fromPrismaFollow(follow: Partial<PrismaFollow>): this {
      if (follow.followId) this.followId = follow.followId;
      if (follow.followerId) this.followerId = follow.followerId;
      if (follow.followingId) this.followingId = follow.followingId;
      if (follow.status) this.status = follow.status;
      if (follow.createdAt) this.createdAt = follow.createdAt;
      if (follow.updatedAt) this.updatedAt = follow.updatedAt;
      if (follow.deletedAt !== undefined) this.deletedAt = follow.deletedAt;
      return this;
   }

   /**
    * Constructs and returns the final validated FollowEntity instance.
    * @throws BadRequestException if followerId or followingId are missing.
    */
   build(): FollowEntity {
      if (!this.followerId || !this.followingId) {
         throw new BadRequestException(USER_BUILDER_ERRORS.FOLLOW_NOT_FOUND);
      }

      const computedFollowId = this.followId || `${this.followerId}-${this.followingId}`;

      return new FollowEntity({
         followId: computedFollowId,
         followerId: this.followerId,
         followingId: this.followingId,
         status: this.status,
         createdAt: this.createdAt,
         updatedAt: this.updatedAt,
         deletedAt: this.deletedAt,
      });
   }
}
