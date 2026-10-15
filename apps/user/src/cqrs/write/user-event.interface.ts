export interface UserEventMetadata {
   timestamp: string;
   correlationId?: string;
   causationId?: string;
   userId?: string;
   [key: string]: unknown;
}

export interface UserStoredEvent<TData = Record<string, unknown>> {
   eventId: string;
   streamId: string;
   eventType: string;
   version: number;
   data: TData;
   metadata: UserEventMetadata;
   createdAt: Date;
}

export interface AppendUserEventDto<TData = Record<string, unknown>> {
   streamId: string;
   eventType: string;
   data: TData;
   eventId?: string;
   metadata?: Partial<UserEventMetadata>;
   createdAt?: Date;
}
