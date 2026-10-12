import { Injectable } from '@nestjs/common';
import { NebulaService, AppLogger } from '@common';
import { FollowStatus } from '@user/core/database/entities';

export const GRAPH_FOLLOW_REPOSITORY = 'GRAPH_FOLLOW_REPOSITORY';

@Injectable()
export class FollowGraphRepository {
   constructor(
      private readonly nebulaService: NebulaService,
      private readonly logger: AppLogger,
   ) {
      this.logger.setContext(FollowGraphRepository.name);
   }

   async createOrUpdateUser(user: {
      id: string;
      userId?: string;
      username?: string | null;
      email?: string | null;
      displayName?: string | null;
      avatar?: string | null;
      bio?: string | null;
      isPrivate?: boolean;
      createdAt?: Date;
      updatedAt?: Date;
   }): Promise<void> {
      const escapedUserId = user.userId ? user.userId.replace(/"/g, '\\"') : user.id;
      const escapedUsername = user.username ? user.username.replace(/"/g, '\\"') : '';
      const escapedDisplayName = user.displayName ? user.displayName.replace(/"/g, '\\"') : '';
      const escapedAvatar = user.avatar ? user.avatar.replace(/"/g, '\\"') : '';
      const isPrivate = Boolean(user.isPrivate);
      const createdAt = user.createdAt ? user.createdAt.getTime() : Date.now();
      const updatedAt = user.updatedAt ? user.updatedAt.getTime() : Date.now();

      const query = `
         INSERT VERTEX User(user_id, username, display_name, avatar, is_private, created_at, updated_at)
         VALUES "${user.id}":("${escapedUserId}", "${escapedUsername}", "${escapedDisplayName}", "${escapedAvatar}", ${isPrivate}, ${createdAt}, ${updatedAt});
      `;

      try {
         await this.nebulaService.execute(query);
         this.logger.debug(`Synced user to graph: ${user.id}`);
      } catch (error) {
         this.logger.error(
            `Failed to sync user to graph: ${user.id}`,
            error instanceof Error ? error.stack : undefined,
         );
         throw error;
      }
   }

   async createFollow(
      followerId: string,
      followingId: string,
      _status: FollowStatus = FollowStatus.ACCEPTED,
   ): Promise<void> {
      void _status;
      const query = `
         INSERT EDGE Follow(createdAt) VALUES "${followerId}" -> "${followingId}":(now());
      `;

      try {
         await this.nebulaService.execute(query);
         this.logger.debug(`Created follow relationship: ${followerId} -> ${followingId}`);
      } catch (error) {
         this.logger.error(
            `Failed to create follow relationship: ${followerId} -> ${followingId}`,
            error instanceof Error ? error.stack : undefined,
         );
         throw error;
      }
   }

   async createFollowRelationship(followerId: string, followingId: string): Promise<void> {
      return this.createFollow(followerId, followingId);
   }

   async updateFollowStatus(followerId: string, followingId: string, _status: FollowStatus): Promise<void> {
      void _status;
      const query = `
         INSERT EDGE Follow(createdAt) VALUES "${followerId}" -> "${followingId}":(now());
      `;

      try {
         await this.nebulaService.execute(query);
         this.logger.debug(`Updated follow status: ${followerId} -> ${followingId}`);
      } catch (error) {
         this.logger.error(
            `Failed to update follow status: ${followerId} -> ${followingId}`,
            error instanceof Error ? error.stack : undefined,
         );
         throw error;
      }
   }

   async deleteFollow(followerId: string, followingId: string): Promise<void> {
      const query = `
         DELETE EDGE Follow "${followerId}" -> "${followingId}";
      `;

      try {
         await this.nebulaService.execute(query);
         this.logger.debug(`Deleted follow relationship: ${followerId} -> ${followingId}`);
      } catch (error) {
         this.logger.error(
            `Failed to delete follow relationship: ${followerId} -> ${followingId}`,
            error instanceof Error ? error.stack : undefined,
         );
         throw error;
      }
   }

   async deleteFollowRelationship(followerId: string, followingId: string): Promise<void> {
      return this.deleteFollow(followerId, followingId);
   }

   async findFollow(followerId: string, followingId: string): Promise<boolean> {
      const query = `
         FETCH PROP ON Follow "${followerId}" -> "${followingId}" YIELD Follow.createdAt;
      `;

      try {
         const result = await this.nebulaService.execute(query);
         return Boolean(result.data && result.data.length > 0);
      } catch {
         this.logger.debug(`Find follow check failed or not found: ${followerId} -> ${followingId}`);
         return false;
      }
   }

   async getFollowers(
      userId: string,
      _status?: FollowStatus,
      skip = 0,
      take = 50,
   ): Promise<
      Array<{ followerId: string; followingId: string; status: FollowStatus; createdAt: Date; updatedAt: Date }>
   > {
      void _status;
      const limit = skip + take;
      const query = `
         GO FROM "${userId}" OVER Follow REVERSELY YIELD Follow._src AS followerId, Follow._dst AS followingId, Follow.createdAt AS createdAt | LIMIT ${limit};
      `;

      try {
         const result = await this.nebulaService.execute(query);
         if (result.data && Array.isArray(result.data)) {
            const rows = result.data.slice(skip);
            return rows.map((row) => ({
               followerId: typeof row.followerId === 'string' ? row.followerId : '',
               followingId: userId,
               status: FollowStatus.ACCEPTED,
               createdAt: row.createdAt ? new Date(Number(row.createdAt)) : new Date(),
               updatedAt: row.createdAt ? new Date(Number(row.createdAt)) : new Date(),
            }));
         }
         return [];
      } catch (error) {
         this.logger.error(
            `Failed to get followers for user: ${userId}`,
            error instanceof Error ? error.stack : undefined,
         );
         return [];
      }
   }

   async getFollowing(
      userId: string,
      _status?: FollowStatus,
      skip = 0,
      take = 50,
   ): Promise<
      Array<{ followerId: string; followingId: string; status: FollowStatus; createdAt: Date; updatedAt: Date }>
   > {
      void _status;
      const limit = skip + take;
      const query = `
         GO FROM "${userId}" OVER Follow YIELD Follow._src AS followerId, Follow._dst AS followingId, Follow.createdAt AS createdAt | LIMIT ${limit};
      `;

      try {
         const result = await this.nebulaService.execute(query);
         if (result.data && Array.isArray(result.data)) {
            const rows = result.data.slice(skip);
            return rows.map((row) => ({
               followerId: userId,
               followingId: typeof row.followingId === 'string' ? row.followingId : '',
               status: FollowStatus.ACCEPTED,
               createdAt: row.createdAt ? new Date(Number(row.createdAt)) : new Date(),
               updatedAt: row.createdAt ? new Date(Number(row.createdAt)) : new Date(),
            }));
         }
         return [];
      } catch (error) {
         this.logger.error(
            `Failed to get following for user: ${userId}`,
            error instanceof Error ? error.stack : undefined,
         );
         return [];
      }
   }

   async countFollowers(userId: string, _status?: FollowStatus): Promise<number> {
      void _status;
      const query = `
         GO FROM "${userId}" OVER Follow REVERSELY YIELD Follow._src AS followerId | COUNT(followerId) AS count;
      `;

      try {
         const result = await this.nebulaService.execute(query);
         if (result.data && result.data.length > 0) {
            return Number(result.data[0].count ?? 0);
         }
         return 0;
      } catch (error) {
         this.logger.error(
            `Failed to count followers for user: ${userId}`,
            error instanceof Error ? error.stack : undefined,
         );
         return 0;
      }
   }

   async countFollowing(userId: string, _status?: FollowStatus): Promise<number> {
      void _status;
      const query = `
         GO FROM "${userId}" OVER Follow YIELD Follow._dst AS followingId | COUNT(followingId) AS count;
      `;

      try {
         const result = await this.nebulaService.execute(query);
         if (result.data && result.data.length > 0) {
            return Number(result.data[0].count ?? 0);
         }
         return 0;
      } catch (error) {
         this.logger.error(
            `Failed to count following for user: ${userId}`,
            error instanceof Error ? error.stack : undefined,
         );
         return 0;
      }
   }

   async getMutualFollowers(userId1: string, userId2: string): Promise<string[]> {
      const query = `
         GO FROM "${userId1}" OVER Follow REVERSELY YIELD Follow._src AS follower1
         INTERSECT
         GO FROM "${userId2}" OVER Follow REVERSELY YIELD Follow._src AS follower2;
      `;

      try {
         const result = await this.nebulaService.execute(query);
         if (result.data && Array.isArray(result.data)) {
            return result.data.map((row) => {
               const val = Object.values(row)[0];
               return typeof val === 'string' ? val : '';
            });
         }
         return [];
      } catch (error) {
         this.logger.error(
            `Failed to get mutual followers between ${userId1} and ${userId2}`,
            error instanceof Error ? error.stack : undefined,
         );
         return [];
      }
   }

   async getFollowSuggestions(userId: string, limit = 10): Promise<string[]> {
      const query = `
         GO 2 STEPS FROM "${userId}" OVER Follow YIELD DISTINCT Follow._dst AS suggestedUserId | LIMIT ${limit};
      `;

      try {
         const result = await this.nebulaService.execute(query);
         if (result.data && Array.isArray(result.data)) {
            return result.data
               .map((row) => (typeof row.suggestedUserId === 'string' ? row.suggestedUserId : ''))
               .filter((id) => id && id !== userId);
         }
         return [];
      } catch (error) {
         this.logger.error(
            `Failed to get follow suggestions for user: ${userId}`,
            error instanceof Error ? error.stack : undefined,
         );
         return [];
      }
   }
}

// Backward-compatible alias
export { FollowGraphRepository as GraphFollowRepository };
