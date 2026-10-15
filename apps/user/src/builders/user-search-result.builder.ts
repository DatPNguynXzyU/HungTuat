import type { IBuilder } from '@common';
import type { UserSearchResultItemDto } from '@contracts/user';

export interface SearchUserDocumentSource {
   userId: string;
   username?: string | null;
   displayName?: string | null;
   avatar?: string | null;
   bio?: string | null;
   isVerified?: boolean;
   followersCount?: number;
   followingCount?: number;
}

export interface RelationshipContext {
   currentUserId?: string;
   followingSet?: Set<string>;
   followerSet?: Set<string>;
}

/**
 * Fluent builder for transforming search index documents into enriched UserSearchResultItemDto items.
 * Encapsulates social graph resolution, self-discovery checks, and fallback defaults.
 */
export class UserSearchResultItemBuilder implements IBuilder<UserSearchResultItemDto> {
   private userId: string = '';
   private username: string | null = null;
   private displayName: string | null = null;
   private avatar: string | null = null;
   private bio: string | null = null;
   private isVerified: boolean = false;
   private followersCount: number = 0;
   private followingCount: number = 0;
   private isFollowing: boolean = false;
   private isFollower: boolean = false;
   private isSelf: boolean = false;

   /**
    * Static factory method to instantiate a new UserSearchResultItemBuilder.
    */
   static create(): UserSearchResultItemBuilder {
      return new UserSearchResultItemBuilder();
   }

   /**
    * Sets the unique user identifier.
    */
   withUserId(userId: string): this {
      this.userId = userId;
      return this;
   }

   withUsername(username?: string | null): this {
      this.username = username ?? null;
      return this;
   }

   withDisplayName(displayName?: string | null): this {
      this.displayName = displayName ?? null;
      return this;
   }

   withAvatar(avatar?: string | null): this {
      this.avatar = avatar ?? null;
      return this;
   }

   withBio(bio?: string | null): this {
      this.bio = bio ?? null;
      return this;
   }

   withIsVerified(isVerified?: boolean): this {
      this.isVerified = isVerified ?? false;
      return this;
   }

   withFollowersCount(count?: number): this {
      this.followersCount = count ?? 0;
      return this;
   }

   withFollowingCount(count?: number): this {
      this.followingCount = count ?? 0;
      return this;
   }

   withRelationshipContext(context: RelationshipContext): this {
      const { currentUserId, followingSet, followerSet } = context;
      if (currentUserId && this.userId) {
         this.isSelf = currentUserId === this.userId;
         this.isFollowing = followingSet ? followingSet.has(this.userId) : false;
         this.isFollower = followerSet ? followerSet.has(this.userId) : false;
      } else {
         this.isSelf = false;
         this.isFollowing = false;
         this.isFollower = false;
      }
      return this;
   }

   fromDocument(doc: SearchUserDocumentSource): this {
      this.withUserId(doc.userId);
      this.withUsername(doc.username);
      this.withDisplayName(doc.displayName);
      this.withAvatar(doc.avatar);
      this.withBio(doc.bio);
      this.withIsVerified(doc.isVerified);
      this.withFollowersCount(doc.followersCount);
      this.withFollowingCount(doc.followingCount);
      return this;
   }

   build(): UserSearchResultItemDto {
      return {
         userId: this.userId,
         username: this.username,
         displayName: this.displayName,
         avatar: this.avatar,
         bio: this.bio,
         isVerified: this.isVerified,
         followersCount: this.followersCount,
         followingCount: this.followingCount,
         isFollowing: this.isFollowing,
         isFollower: this.isFollower,
         isSelf: this.isSelf,
      };
   }
}
