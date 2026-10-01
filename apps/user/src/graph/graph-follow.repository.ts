import { Injectable, Logger } from '@nestjs/common';
import { NebulaService } from '@common';
import { FollowStatus } from '@user/entities';

export interface GraphFollowResult {
   followerId: string;
   followingId: string;
   status: FollowStatus;
   createdAt: Date;
   updatedAt: Date;
}

interface NebulaRowData {
   follower_id?: string;
   following_id?: string;
   status?: string;
   created_at?: number;
   updated_at?: number;
   count?: number;
   mutual_follower?: string;
   suggested_user?: string;
}

@Injectable()
export class GraphFollowRepository {
   private readonly logger = new Logger(GraphFollowRepository.name);

   constructor(private readonly nebulaService: NebulaService) {}

   async createOrUpdateUser(data: {
      userId: string;
      username?: string;
      displayName?: string;
      avatar?: string;
      isPrivate?: boolean;
   }): Promise<void> {
      const now = Date.now();
      const query = `
      USE social_graph;
      INSERT VERTEX user(user_id, username, display_name, avatar, is_private, created_at, updated_at)
      VALUES "${data.userId}":("${data.userId}", "${data.username || ''}", "${data.displayName || ''}", "${data.avatar || ''}", ${data.isPrivate || false}, ${now}, ${now});
    `;

      await this.nebulaService.execute(query);
   }

   async createFollow(followerId: string, followingId: string, status: FollowStatus): Promise<GraphFollowResult> {
      const now = Date.now();
      const query = `
      USE social_graph;
      INSERT EDGE follow(status, created_at, updated_at)
      VALUES "${followerId}"->"${followingId}":("${status}", ${now}, ${now});
    `;

      await this.nebulaService.execute(query);

      return {
         followerId,
         followingId,
         status,
         createdAt: new Date(now),
         updatedAt: new Date(now),
      };
   }

   async updateFollowStatus(followerId: string, followingId: string, status: FollowStatus): Promise<GraphFollowResult> {
      const now = Date.now();
      const query = `
      USE social_graph;
      UPDATE EDGE ON follow "${followerId}"->"${followingId}"
      SET status = "${status}", updated_at = ${now};
    `;

      await this.nebulaService.execute(query);

      return {
         followerId,
         followingId,
         status,
         createdAt: new Date(), // Will be fetched in real implementation
         updatedAt: new Date(now),
      };
   }

   async deleteFollow(followerId: string, followingId: string): Promise<void> {
      const query = `
      USE social_graph;
      DELETE EDGE follow "${followerId}"->"${followingId}";
    `;

      await this.nebulaService.execute(query);
   }

   async findFollow(followerId: string, followingId: string): Promise<GraphFollowResult | null> {
      const query = `
      USE social_graph;
      GO FROM "${followerId}" OVER follow WHERE id($$) == "${followingId}"
      YIELD follow.status AS status, follow.created_at AS created_at, follow.updated_at AS updated_at;
    `;

      const result = await this.nebulaService.execute(query);

      if (!result.data || result.data.length === 0) {
         return null;
      }

      const row = result.data[0] as NebulaRowData;
      return {
         followerId,
         followingId,
         status: (row.status || 'ACCEPTED') as FollowStatus,
         createdAt: new Date(row.created_at || Date.now()),
         updatedAt: new Date(row.updated_at || Date.now()),
      };
   }

   async getFollowers(userId: string, status?: FollowStatus, skip = 0, take = 20): Promise<GraphFollowResult[]> {
      const statusFilter = status ? `WHERE follow.status == "${status}"` : '';
      const query = `
      USE social_graph;
      GO FROM "${userId}" OVER follow REVERSELY
      ${statusFilter}
      YIELD id($^) AS follower_id, id($$) AS following_id, follow.status AS status,
            follow.created_at AS created_at, follow.updated_at AS updated_at
      | ORDER BY $-.created_at DESC
      | LIMIT ${skip}, ${take};
    `;

      const result = await this.nebulaService.execute(query);

      if (!result.data || result.data.length === 0) {
         return [];
      }

      return result.data.map((row: NebulaRowData) => ({
         followerId: row.follower_id || '',
         followingId: row.following_id || '',
         status: (row.status || 'ACCEPTED') as FollowStatus,
         createdAt: new Date(row.created_at || Date.now()),
         updatedAt: new Date(row.updated_at || Date.now()),
      }));
   }

   async getFollowing(userId: string, status?: FollowStatus, skip = 0, take = 20): Promise<GraphFollowResult[]> {
      const statusFilter = status ? `WHERE follow.status == "${status}"` : '';
      const query = `
      USE social_graph;
      GO FROM "${userId}" OVER follow
      ${statusFilter}
      YIELD id($^) AS follower_id, id($$) AS following_id, follow.status AS status,
            follow.created_at AS created_at, follow.updated_at AS updated_at
      | ORDER BY $-.created_at DESC
      | LIMIT ${skip}, ${take};
    `;

      const result = await this.nebulaService.execute(query);

      if (!result.data || result.data.length === 0) {
         return [];
      }

      return result.data.map((row: NebulaRowData) => ({
         followerId: row.follower_id || '',
         followingId: row.following_id || '',
         status: (row.status || 'ACCEPTED') as FollowStatus,
         createdAt: new Date(row.created_at || Date.now()),
         updatedAt: new Date(row.updated_at || Date.now()),
      }));
   }

   async countFollowers(userId: string, status?: FollowStatus): Promise<number> {
      const statusFilter = status ? `WHERE follow.status == "${status}"` : '';
      const query = `
      USE social_graph;
      GO FROM "${userId}" OVER follow REVERSELY
      ${statusFilter}
      YIELD count(*) AS count;
    `;

      const result = await this.nebulaService.execute(query);

      if (!result.data || result.data.length === 0) {
         return 0;
      }

      const row = result.data[0] as NebulaRowData;
      return row.count || 0;
   }

   async countFollowing(userId: string, status?: FollowStatus): Promise<number> {
      const statusFilter = status ? `WHERE follow.status == "${status}"` : '';
      const query = `
      USE social_graph;
      GO FROM "${userId}" OVER follow
      ${statusFilter}
      YIELD count(*) AS count;
    `;

      const result = await this.nebulaService.execute(query);

      if (!result.data || result.data.length === 0) {
         return 0;
      }

      const row = result.data[0] as NebulaRowData;
      return row.count || 0;
   }

   // Advanced graph queries
   async getMutualFollowers(userId1: string, userId2: string): Promise<string[]> {
      const query = `
      USE social_graph;
      GO FROM "${userId1}" OVER follow WHERE follow.status == "ACCEPTED"
      YIELD id($$) AS following
      | GO FROM $-.following OVER follow WHERE id($$) == "${userId2}" AND follow.status == "ACCEPTED"
      YIELD DISTINCT $-.following AS mutual_follower;
    `;

      const result = await this.nebulaService.execute(query);

      if (!result.data || result.data.length === 0) {
         return [];
      }

      return result.data.map((row: NebulaRowData) => row.mutual_follower || '');
   }

   async getFollowSuggestions(userId: string, limit = 10): Promise<string[]> {
      // Find users that the user's following are following (2-hop)
      const query = `
      USE social_graph;
      GO 2 STEPS FROM "${userId}" OVER follow WHERE follow.status == "ACCEPTED"
      YIELD DISTINCT id($$) AS suggested_user
      | WHERE $-.suggested_user != "${userId}"
      | LIMIT ${limit};
    `;

      const result = await this.nebulaService.execute(query);

      if (!result.data || result.data.length === 0) {
         return [];
      }

      return result.data.map((row: NebulaRowData) => row.suggested_user || '');
   }
}
