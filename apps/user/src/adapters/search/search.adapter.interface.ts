export const SEARCH_ADAPTER = Symbol('SEARCH_ADAPTER');

/**
 * Represents a user document hit retrieved from the Elasticsearch inverted index.
 */
export interface ElasticsearchUserHit {
   /**
    * The unique User ID (UUID) of the user entity in the database.
    */
   userId: string;

   /**
    * Unique document identifier in the Elasticsearch index (corresponds to userId).
    */
   documentId?: string;

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
}

export interface ElasticsearchSearchResult {
   items: ElasticsearchUserHit[];
   nextCursor: string | null;
   hasMore: boolean;
   total?: number;
}

/**
 * Port contract for Search microservice operations.
 * Decouples User search & sync domains from RabbitMQ ClientProxy transport.
 */
export interface ISearchAdapter {
   searchUsers(query: string, limit?: number, cursor?: string): Promise<ElasticsearchSearchResult>;
   emitIndexEvent(pattern: string, payload: unknown): void;
}
