import { type BulkOperationType, type SearchIndex } from '@contracts/search';

export interface BulkOperation {
   operation: BulkOperationType;
   index: SearchIndex;
   /** Target Elasticsearch document ID (e.g. userId, recipeId) */
   documentId: string;
   data?: Record<string, unknown>;
}
