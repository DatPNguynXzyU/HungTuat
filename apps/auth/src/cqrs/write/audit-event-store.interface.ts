import type { CreateAuditLogData } from '@auth/entities/audit-log.entity';
import type { AuditEvent } from '@auth/cqrs/write/audit-event.interface';

export interface IAuditEventStore {
   appendEvent(event: CreateAuditLogData): Promise<AuditEvent>;
   getStream(streamId: string, fromVersion?: number): Promise<AuditEvent[]>;
   getAllEvents(options?: { fromVersion?: number; take?: number; skip?: number }): Promise<AuditEvent[]>;
   countEvents(streamId?: string): Promise<number>;
}
