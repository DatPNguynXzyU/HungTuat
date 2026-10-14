export interface RetryJob<TData = unknown> {
   id: string;
   queueName: string;
   data: TData;
   retryCount: number;
   maxRetries: number;
   nextRunAt: number;
   createdAt: number;
   lastError?: string;
}

export interface RetryQueueAddOptions {
   maxRetries?: number;
   delayMs?: number;
}
