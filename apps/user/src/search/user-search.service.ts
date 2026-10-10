import { Injectable, OnModuleInit } from '@nestjs/common';
import { ElasticsearchService, AppLogger } from '@common';

export interface UserDocument {
   id: string;
   email?: string | null;
   username?: string | null;
   displayName?: string | null;
   bio?: string | null;
   createdAt: Date;
   updatedAt: Date;
}

interface SearchHit {
   _source: UserDocument;
}

interface SearchResponse {
   hits: {
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
                        username: { type: 'keyword' },
                        displayName: { type: 'text' },
                        bio: { type: 'text' },
                        createdAt: { type: 'date' },
                        updatedAt: { type: 'date' },
                     },
                  },
               },
            });
         }
      } catch (error) {
         this.logger.error('Failed to create Elasticsearch index', error instanceof Error ? error.stack : undefined);
      }
   }

   async indexUser(
      user:
         | UserDocument
         | {
              id: string;
              email?: string | null;
              username?: string | null;
              displayName?: string | null;
              bio?: string | null;
              createdAt: Date;
              updatedAt: Date;
           },
   ): Promise<void> {
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
               bio: user.bio ?? undefined,
               createdAt: user.createdAt,
               updatedAt: user.updatedAt,
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

   async updateUser(
      user:
         | UserDocument
         | {
              id: string;
              email?: string | null;
              username?: string | null;
              displayName?: string | null;
              bio?: string | null;
              updatedAt: Date;
           },
   ): Promise<void> {
      try {
         const client = this.elasticsearchService.getClient();
         await client.update({
            index: this.INDEX_NAME,
            id: user.id,
            doc: {
               email: user.email ?? undefined,
               username: user.username ?? undefined,
               displayName: user.displayName ?? undefined,
               bio: user.bio ?? undefined,
               updatedAt: user.updatedAt,
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

   async searchUsers(query: string, limit = 20, skip = 0): Promise<UserDocument[]> {
      try {
         const client = this.elasticsearchService.getClient();
         const result = (await client.search({
            index: this.INDEX_NAME,
            from: skip,
            size: limit,
            body: {
               query: {
                  multi_match: {
                     query,
                     fields: ['username^3', 'displayName^2', 'bio'],
                     fuzziness: 'AUTO',
                  },
               },
            },
         })) as SearchResponse;

         return result.hits.hits.map((hit) => hit._source);
      } catch (error) {
         this.logger.error(`Failed to search users: ${query}`, error instanceof Error ? error.stack : undefined);
         return [];
      }
   }
}
