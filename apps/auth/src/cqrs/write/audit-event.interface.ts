export interface AuditEventMetadata {
   timestamp: string;
   correlationId?: string;
   causationId?: string;
   [key: string]: unknown;
}

export interface AuditEvent<TData = Record<string, unknown>> {
   eventId: string;
   streamId: string;
   eventType: string;
   version: number;
   data: TData;
   metadata: AuditEventMetadata;
   createdAt: Date;
}
