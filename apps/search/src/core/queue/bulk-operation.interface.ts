export interface BulkOperation {
   operation: 'index' | 'update' | 'delete';
   index: string;
   id: string;
   data?: Record<string, unknown>;
}
