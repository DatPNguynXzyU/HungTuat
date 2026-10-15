import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { uuidv7, AuditSanitizerUtil } from '@common';
import { PrismaService } from '@user/core/database/prisma/prisma.service';
import { Prisma, type UserEventStream } from '@user/prisma-client';
import { USER_CQRS_EVENTS } from '@user/cqrs/constants/user-cqrs.constant';
import type { AppendUserEventDto, UserEventMetadata, UserStoredEvent } from '@user/cqrs/write/user-event.interface';
import type { IUserEventStore } from '@user/cqrs/write/user-event-store.interface';

@Injectable()
export class UserEventStore implements IUserEventStore {
   private readonly logger = new Logger(UserEventStore.name);

   constructor(
      private readonly prisma: PrismaService,
      private readonly eventEmitter: EventEmitter2,
   ) {}

   private toStoredEvent<T = Record<string, unknown>>(record: UserEventStream): UserStoredEvent<T> {
      return {
         eventId: record.eventId,
         streamId: record.streamId,
         eventType: record.eventType,
         version: record.version,
         data: record.data as unknown as T,
         metadata: record.metadata as unknown as UserEventMetadata,
         createdAt: record.createdAt,
      };
   }

   async appendEvent<T = Record<string, unknown>>(params: AppendUserEventDto<T>): Promise<UserStoredEvent<T>> {
      const eventId = params.eventId || uuidv7();
      const createdAt = params.createdAt || new Date();

      const sanitizedMeta = params.metadata
         ? (AuditSanitizerUtil.sanitize(params.metadata) as Prisma.InputJsonValue)
         : null;

      const eventMetadata: Prisma.InputJsonValue = {
         timestamp: createdAt.toISOString(),
         ...(sanitizedMeta && typeof sanitizedMeta === 'object' && !Array.isArray(sanitizedMeta) ? sanitizedMeta : {}),
      };

      const record = await this.prisma.userEventStream.create({
         data: {
            eventId,
            streamId: params.streamId,
            eventType: params.eventType,
            data: params.data as unknown as Prisma.InputJsonValue,
            metadata: eventMetadata,
            createdAt,
         },
      });

      const storedEvent = this.toStoredEvent<T>(record);

      this.logger.debug?.(`Event appended to stream ${params.streamId}: ${params.eventType} (v${record.version})`);

      // Emit event asynchronously to trigger read projections
      this.eventEmitter.emit(USER_CQRS_EVENTS.EVENT_APPENDED, storedEvent);

      return storedEvent;
   }

   async getStream(streamId: string, fromVersion?: number): Promise<UserStoredEvent[]> {
      const records = await this.prisma.userEventStream.findMany({
         where: {
            streamId,
            ...(fromVersion !== undefined ? { version: { gte: fromVersion } } : {}),
         },
         orderBy: { version: 'asc' },
      });

      return records.map((record) => this.toStoredEvent(record));
   }

   async getAllEvents(options?: { fromVersion?: number; take?: number; skip?: number }): Promise<UserStoredEvent[]> {
      const records = await this.prisma.userEventStream.findMany({
         where: {
            ...(options?.fromVersion !== undefined ? { version: { gte: options.fromVersion } } : {}),
         },
         orderBy: { version: 'asc' },
         ...(options?.skip !== undefined ? { skip: options.skip } : {}),
         ...(options?.take !== undefined ? { take: options.take } : {}),
      });

      return records.map((record) => this.toStoredEvent(record));
   }

   async countEvents(streamId?: string): Promise<number> {
      return this.prisma.userEventStream.count({
         where: streamId ? { streamId } : undefined,
      });
   }
}
