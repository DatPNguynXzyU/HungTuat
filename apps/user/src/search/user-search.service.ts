import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ElasticsearchService } from '@common';
import { UserEntity } from '@user/entities';

export interface UserSearchDoc {
   id: string;
   userId: string;
   username: string | null;
   displayName: string | null;
   bio: string | null;
   avatar: string | null;
   status: string;
   createdAt: Date;
   updatedAt: Date;
}

export interface UserSearchResult {
   id: string;
   userId: string;
   username: string | null;
   displayName: string | null;
   bio: string | null;
   avatar: string | null;
   status: string;
   score?: number;
}

@Injectable()
export class UserSearchService implements OnModuleInit {
   private readonly logger = new Logger(UserSearchService.name);
   private readonly indexName = 'users';

   constructor(private readonly elasticsearchService: ElasticsearchService) {}

   async onModuleInit(): Promise<void> {
      await this.ensureIndex();
   }

   private async ensureIndex(): Promise<void> {
      try {
         const client = this.elasticsearchService.getClient();
         const exists = await client.indices.exists({ index: this.indexName });

         if (!exists) {
            this.logger.log(`Creating Elasticsearch index: ${this.indexName}...`);
            await client.indices.create({
               index: this.indexName,
               settings: {
                  analysis: {
                     filter: {
                        user_edge_ngram: {
                           type: 'edge_ngram',
                           min_gram: 1,
                           max_gram: 20,
                        },
                     },
                     analyzer: {
                        user_autocomplete: {
                           type: 'custom',
                           tokenizer: 'standard',
                           filter: ['lowercase', 'asciifolding', 'user_edge_ngram'],
                        },
                        user_search: {
                           type: 'custom',
                           tokenizer: 'standard',
                           filter: ['lowercase', 'asciifolding'],
                        },
                     },
                  },
               },
               mappings: {
                  properties: {
                     id: { type: 'keyword' },
                     userId: { type: 'keyword' },
                     username: {
                        type: 'text',
                        analyzer: 'user_autocomplete',
                        search_analyzer: 'user_search',
                        fields: {
                           keyword: { type: 'keyword', ignore_above: 256 },
                        },
                     },
                     displayName: {
                        type: 'text',
                        analyzer: 'user_autocomplete',
                        search_analyzer: 'user_search',
                        fields: {
                           keyword: { type: 'keyword', ignore_above: 256 },
                        },
                     },
                     bio: { type: 'text', analyzer: 'standard' },
                     avatar: { type: 'keyword', index: false },
                     status: { type: 'keyword' },
                     createdAt: { type: 'date' },
                     updatedAt: { type: 'date' },
                  },
               },
            });
            this.logger.log(`Index ${this.indexName} created successfully.`);
         }
      } catch (error) {
         this.logger.warn(`Could not verify/create index ${this.indexName}: ${(error as Error).message}`);
      }
   }

   async indexUser(user: UserEntity): Promise<void> {
      try {
         const client = this.elasticsearchService.getClient();
         const doc: UserSearchDoc = {
            id: user.id,
            userId: user.userId,
            username: user.username,
            displayName: user.displayName,
            bio: user.bio,
            avatar: user.avatar,
            status: user.status,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
         };

         await client.index({
            index: this.indexName,
            id: user.id,
            document: doc,
         });
      } catch (error) {
         this.logger.error(`Failed to index user ${user.id} in Elasticsearch: ${(error as Error).message}`);
      }
   }

   async updateUser(id: string, partial: Partial<UserSearchDoc>): Promise<void> {
      try {
         const client = this.elasticsearchService.getClient();
         await client.update({
            index: this.indexName,
            id,
            doc: {
               ...partial,
               updatedAt: new Date(),
            },
            doc_as_upsert: true,
         });
      } catch (error) {
         this.logger.error(`Failed to update user ${id} in Elasticsearch: ${(error as Error).message}`);
      }
   }

   async deleteUser(id: string): Promise<void> {
      try {
         const client = this.elasticsearchService.getClient();
         await client.delete({
            index: this.indexName,
            id,
         });
      } catch (error) {
         this.logger.warn(`Failed to delete user ${id} from Elasticsearch: ${(error as Error).message}`);
      }
   }

   async searchUsers(
      query: string,
      limit = 10,
      skip = 0,
   ): Promise<{ users: UserSearchResult[]; total: number; page: number; limit: number }> {
      const trimmedQuery = query?.trim();
      if (!trimmedQuery) {
         return { users: [], total: 0, page: Math.floor(skip / limit) + 1, limit };
      }

      try {
         const client = this.elasticsearchService.getClient();
         const lowerQuery = trimmedQuery.toLowerCase();

         const response = await client.search<UserSearchDoc>({
            index: this.indexName,
            from: skip,
            size: limit,
            query: {
               bool: {
                  must: [
                     {
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
                                    query: trimmedQuery,
                                    fields: ['username^4', 'displayName^3', 'bio'],
                                    fuzziness: 'AUTO',
                                    prefix_length: 2,
                                 },
                              },
                           ],
                           minimum_should_match: 1,
                        },
                     },
                  ],
                  filter: [
                     {
                        term: {
                           status: 'ACTIVE',
                        },
                     },
                  ],
               },
            },
         });

         const hits = response.hits.hits;
         const total = typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value || 0;

         const users: UserSearchResult[] = hits.map((hit) => {
            const source = hit._source as UserSearchDoc;
            return {
               id: source.id,
               userId: source.userId,
               username: source.username,
               displayName: source.displayName,
               bio: source.bio,
               avatar: source.avatar,
               status: source.status,
               score: hit._score ?? undefined,
            };
         });

         return {
            users,
            total,
            page: Math.floor(skip / limit) + 1,
            limit,
         };
      } catch (error) {
         this.logger.error(`Error searching users with query "${query}": ${(error as Error).message}`);
         return { users: [], total: 0, page: Math.floor(skip / limit) + 1, limit };
      }
   }
}
