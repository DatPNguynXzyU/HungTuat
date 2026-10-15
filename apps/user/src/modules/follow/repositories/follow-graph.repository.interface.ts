import type { FollowStatus } from '@user/core/database/entities';

export const GRAPH_FOLLOW_REPOSITORY = Symbol('GRAPH_FOLLOW_REPOSITORY');

export interface GraphUserData {
   userId: string;
   username?: string | null;
   email?: string | null;
   displayName?: string | null;
   avatar?: string | null;
   bio?: string | null;
   isPrivate?: boolean;
   createdAt?: Date;
   updatedAt?: Date;
}

export interface GraphFollowRelation {
   followerId: string;
   followingId: string;
   status: FollowStatus;
   createdAt: Date;
   updatedAt: Date;
}

export interface IFollowGraphRepository {
   createOrUpdateUser(user: GraphUserData): Promise<void>;
   createFollow(followerId: string, followingId: string, status?: FollowStatus): Promise<void>;
   createFollowRelationship(followerId: string, followingId: string): Promise<void>;
   updateFollowStatus(followerId: string, followingId: string, status: FollowStatus): Promise<void>;
   deleteFollow(followerId: string, followingId: string): Promise<void>;
   deleteFollowRelationship(followerId: string, followingId: string): Promise<void>;
   findFollow(followerId: string, followingId: string): Promise<boolean>;
   getFollowers(userId: string, status?: FollowStatus, skip?: number, take?: number): Promise<GraphFollowRelation[]>;
   getFollowing(userId: string, status?: FollowStatus, skip?: number, take?: number): Promise<GraphFollowRelation[]>;
   countFollowers(userId: string, status?: FollowStatus): Promise<number>;
   countFollowing(userId: string, status?: FollowStatus): Promise<number>;
   getMutualFollowers(userId1: string, userId2: string): Promise<string[]>;
   getFollowSuggestions(userId: string, limit?: number): Promise<string[]>;
}

// Backward-compatible alias
export type IGraphFollowRepository = IFollowGraphRepository;
