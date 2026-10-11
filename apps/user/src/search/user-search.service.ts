import { Injectable, OnModuleInit } from '@nestjs/common';
import { ElasticsearchService, AppLogger } from '@common';

export interface UserDocument {
   id: string;
   email?: string | null;
   username?: string | null;
   displayName?: string | null;
   avatar?: string | null;
   bio?: string | null;
   isVerified?: boolean;
   followersCount?: number;
   followingCount?: number;
   createdAt: Date;
   updatedAt: Date;
}

interface SearchHit {
   _source: UserDocument;
   sort?: (string | number)[];
}

interface SearchResponse {
   hits: {
      total?: number | { value: number; relation?: string };
      hits: SearchHit[];
   };
}

@Injectable()
export class UserSearchService implements OnModuleInit {
   private readonly INDEX_NAME = 'users';

   constructor(
      private readonly elasticsearchService: ElasticsearchService,
      private readonly logger: AppLogger,
   ) {
      this.logger.setContext(UserSearchService.name);
   }

   async onModuleInit() {
      await this.createIndexIfNotExists();
   }

   private async createIndexIfNotExists(): Promise<void> {
      try {
         const client = this.elasticsearchService.getClient();
         const indexExists = await client.indices.exists({
            index: this.INDEX_NAME,
         });

         if (!indexExists) {
            this.logger.log(`Creating Elasticsearch index: ${this.INDEX_NAME}`);
            await client.indices.create({
               index: this.INDEX_NAME,
               body: {
                  mappings: {
                     properties: {
                        id: { type: 'keyword' },
                        email: { type: 'keyword' },
                        username: {
                           type: 'text',
                           fields: {
                              keyword: { type: 'keyword', normalizer: 'lowercase' },
                           },
                        },
                        displayName: {
                           type: 'text',
                           fields: {
                              keyword: { type: 'keyword' },
                           },
                        },
                        bio: { type: 'text' },
                        avatar: { type: 'keyword' },
                        isVerified: { type: 'boolean' },
                        followersCount: { type: 'integer' },
                        followingCount: { type: 'integer' },
                        createdAt: { type: 'date' },
                        updatedAt: { type: 'date' },
                     },
                  },
                  settings: {
                     analysis: {
                        normalizer: {
                           lowercase: {
                              type: 'custom',
                              char_filter: [],
                              filter: ['lowercase'],
                           },
                        },
                     },
                  },
               },
            });
         }
      } catch (error) {
         this.logger.error('Failed to create Elasticsearch index', error instanceof Error ? error.stack : undefined);
      }
   }

   async indexUser(user: {
      id: string;
      email?: string | null;
      username?: string | null;
      displayName?: string | null;
      avatar?: string | null;
      bio?: string | null;
      isVerified?: boolean;
      followersCount?: number;
      followingCount?: number;
      createdAt?: Date;
      updatedAt?: Date;
   }): Promise<void> {
      try {
         const client = this.elasticsearchService.getClient();
         await client.index({
            index: this.INDEX_NAME,
            id: user.id,
            document: {
               id: user.id,
               email: user.email ?? undefined,
               username: user.username ?? undefined,
               displayName: user.displayName ?? undefined,
               avatar: user.avatar ?? undefined,
               bio: user.bio ?? undefined,
               isVerified: user.isVerified ?? false,
               followersCount: user.followersCount ?? 0,
               followingCount: user.followingCount ?? 0,
               createdAt: user.createdAt ?? new Date(),
               updatedAt: user.updatedAt ?? new Date(),
            },
         });
         this.logger.debug(`Indexed user: ${user.username ?? user.id}`);
      } catch (error) {
         this.logger.error(
            `Failed to index user: ${user.username ?? user.id}`,
            error instanceof Error ? error.stack : undefined,
         );
         throw error;
      }
   }

   async updateUser(user: {
      id: string;
      email?: string | null;
      username?: string | null;
      displayName?: string | null;
      avatar?: string | null;
      bio?: string | null;
      isVerified?: boolean;
      followersCount?: number;
      followingCount?: number;
      updatedAt?: Date;
   }): Promise<void> {
      try {
         const client = this.elasticsearchService.getClient();
         await client.update({
            index: this.INDEX_NAME,
            id: user.id,
            doc: {
               email: user.email ?? undefined,
               username: user.username ?? undefined,
               displayName: user.displayName ?? undefined,
               avatar: user.avatar ?? undefined,
               bio: user.bio ?? undefined,
               isVerified: user.isVerified,
               followersCount: user.followersCount,
               followingCount: user.followingCount,
               updatedAt: user.updatedAt ?? new Date(),
            },
         });
         this.logger.debug(`Updated user in index: ${user.username ?? user.id}`);
      } catch (error) {
         this.logger.error(
            `Failed to update user in index: ${user.username ?? user.id}`,
            error instanceof Error ? error.stack : undefined,
         );
         throw error;
      }
   }

   async deleteUser(userId: string): Promise<void> {
      try {
         const client = this.elasticsearchService.getClient();
         await client.delete({
            index: this.INDEX_NAME,
            id: userId,
         });
         this.logger.debug(`Deleted user from index: ${userId}`);
      } catch (error) {
         this.logger.error(
            `Failed to delete user from index: ${userId}`,
            error instanceof Error ? error.stack : undefined,
         );
         throw error;
      }
   }

   async searchUsers(
      query: string,
      limit = 20,
      cursor?: string,
   ): Promise<{ items: UserDocument[]; nextCursor: string | null; hasMore: boolean; total?: number }> {
      const cleanQuery = query ? query.trim() : '';
      if (!cleanQuery) {
         return { items: [], nextCursor: null, hasMore: false, total: 0 };
      }

      let searchAfter: (string | number)[] | undefined = undefined;
      if (cursor && cursor.trim()) {
         try {
            const decoded = Buffer.from(cursor.trim(), 'base64url').toString('utf8');
            const parsed: unknown = JSON.parse(decoded);
            if (Array.isArray(parsed)) {
               searchAfter = parsed as (string | number)[];
            }
         } catch {
            this.logger.warn(`Invalid search cursor provided: ${cursor}`);
         }
      }

      try {
         const client = this.elasticsearchService.getClient();
         const lowerQuery = cleanQuery.toLowerCase();
         const fetchSize = limit + 1;

         const result = (await client.search({
            index: this.INDEX_NAME,
            size: fetchSize,
            body: {
               query: {
                  bool: {
                     should: [
                        {
                           term: {
                              'username.keyword': {
                                 value: lowerQuery,
                                 boost: 10,
                              },
                           },
                        },
                        {
                           prefix: {
                              'username.keyword': {
                                 value: lowerQuery,
                                 boost: 5,
                              },
                           },
                        },
                        {
                           multi_match: {
                              query: cleanQuery,
                              fields: ['username^4', 'displayName^2', 'bio^1'],
                              fuzziness: 'AUTO',
                              prefix_length: 2,
                           },
                        },
                     ],
                     minimum_should_match: 1,
                  },
               },
               sort: [{ _score: { order: 'desc' } }, { id: { order: 'asc' } }],
               ...(searchAfter && searchAfter.length > 0 ? { search_after: searchAfter } : {}),
            },
         })) as SearchResponse;

         const totalCount =
            typeof result.hits.total === 'number'
               ? result.hits.total
               : typeof result.hits.total?.value === 'number'
                 ? result.hits.total.value
                 : result.hits.hits.length;

         const hits = result.hits.hits || [];
         const hasMore = hits.length > limit;
         const slicedHits = hasMore ? hits.slice(0, limit) : hits;

         let nextCursor: string | null = null;
         if (hasMore && slicedHits.length > 0) {
            const lastHit = slicedHits[slicedHits.length - 1];
            if (lastHit?.sort && Array.isArray(lastHit.sort)) {
               nextCursor = Buffer.from(JSON.stringify(lastHit.sort)).toString('base64url');
            }
         }

         return {
            items: slicedHits.map((hit) => hit._source),
            nextCursor,
            hasMore,
            total: totalCount,
         };
      } catch (error) {
         this.logger.error(`Failed to search users: ${query}`, error instanceof Error ? error.stack : undefined);
         return { items: [], nextCursor: null, hasMore: false, total: 0 };
      }
   }
}
