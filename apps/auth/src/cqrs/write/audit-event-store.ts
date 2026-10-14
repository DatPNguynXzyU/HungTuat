import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { uuidv7, AuditSanitizerUtil } from '@common';
import { PrismaService } from '@auth/prisma/prisma.service';
import { AuditStatus, Prisma, type AuditEventStream } from '@auth/prisma-client';
import { AUDIT_CQRS_EVENTS } from '@auth/cqrs/constants/audit-cqrs.constant';
import type { AuditEvent, AuditEventMetadata } from '@auth/cqrs/write/audit-event.interface';
import type { IAuditEventStore } from '@auth/cqrs/write/audit-event-store.interface';
import type { CreateAuditLogData } from '@auth/entities/audit-log.entity';

@Injectable()
export class AuditEventStore implements IAuditEventStore {
   private readonly logger = new Logger(AuditEventStore.name);

   constructor(
      private readonly prisma: PrismaService,
      private readonly eventEmitter: EventEmitter2,
   ) {}

   private toEvent(record: AuditEventStream): AuditEvent {
      return {
         eventId: record.eventId,
         streamId: record.streamId,
         eventType: record.eventType,
         version: record.version,
         data: record.data as Record<string, unknown>,
         metadata: record.metadata as unknown as AuditEventMetadata,
         createdAt: record.createdAt,
      };
   }

   async appendEvent(data: CreateAuditLogData): Promise<AuditEvent> {
      const streamId = `audit-${data.accountId || 'system'}`;
      const eventId = data.id || uuidv7();

      const sanitizedMeta = data.metadata
         ? (AuditSanitizerUtil.sanitize(data.metadata) as Prisma.InputJsonValue)
         : null;

      const correlationId = typeof data.metadata?.correlationId === 'string' ? data.metadata.correlationId : undefined;

      const status = data.status === 'FAILURE' ? AuditStatus.FAILURE : AuditStatus.SUCCESS;

      const eventPayload: Prisma.InputJsonValue = {
         accountId: data.accountId || null,
         actorEmail: data.actorEmail || null,
         action: data.action,
         status,
         ipAddress: data.ipAddress || null,
         userAgent: data.userAgent || null,
         deviceType: data.deviceType || null,
         deviceName: data.deviceName || null,
         browser: data.browser || null,
         os: data.os || null,
         city: data.city || null,
         country: data.country || null,
         reason: data.reason || null,
         metadata: sanitizedMeta,
      };

      const eventMetadata: Prisma.InputJsonValue = {
         timestamp: data.createdAt || new Date().toISOString(),
         ...(correlationId ? { correlationId } : {}),
      };

      const record = await this.prisma.auditEventStream.create({
         data: {
            eventId,
            streamId,
            eventType: data.action,
            data: eventPayload,
            metadata: eventMetadata,
            ...(data.createdAt ? { createdAt: new Date(data.createdAt) } : {}),
         },
      });

      const auditEvent = this.toEvent(record);

      // Emit event asynchronously to trigger read projections
      this.eventEmitter.emit(AUDIT_CQRS_EVENTS.EVENT_APPENDED, data);

      return auditEvent;
   }

   async getStream(streamId: string, fromVersion?: number): Promise<AuditEvent[]> {
      const records = await this.prisma.auditEventStream.findMany({
         where: {
            streamId,
            ...(fromVersion !== undefined ? { version: { gte: fromVersion } } : {}),
         },
         orderBy: { version: 'asc' },
      });

      return records.map((r) => this.toEvent(r));
   }

   async getAllEvents(options?: { fromVersion?: number; take?: number; skip?: number }): Promise<AuditEvent[]> {
      const records = await this.prisma.auditEventStream.findMany({
         where: {
            ...(options?.fromVersion !== undefined ? { version: { gte: options.fromVersion } } : {}),
         },
         orderBy: { version: 'asc' },
         ...(options?.skip !== undefined ? { skip: options.skip } : {}),
         ...(options?.take !== undefined ? { take: options.take } : {}),
      });

      return records.map((r) => this.toEvent(r));
   }

   async countEvents(streamId?: string): Promise<number> {
      return this.prisma.auditEventStream.count({
         where: streamId ? { streamId } : undefined,
      });
   }
}
