import type { UserEntity } from '@user/core/database/entities';

export const USER_GRAPH_SYNC_SERVICE = Symbol('USER_GRAPH_SYNC_SERVICE');

/**
 * Port contract for Graph database synchronization operations (Nebula Graph).
 */
export interface IUserGraphSyncService {
   syncUserToGraph(user: UserEntity): Promise<void>;
   syncUsersToGraph(users: UserEntity[]): Promise<void>;
   syncFollowRelationship(followerId: string, followingId: string): Promise<void>;
   syncUnfollowRelationship(followerId: string, followingId: string): Promise<void>;
   processSyncRetries(): Promise<{ processed: number }>;
}
