import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { SERVICES } from '@common';
import { OUTBOX_REPOSITORY } from '@auth/outbox/repositories/outbox.repository.interface';
import type { IOutboxRepository } from '@auth/outbox/repositories/outbox.repository.interface';

@Injectable()
export class OutboxPublisherService implements OnModuleInit, OnModuleDestroy {
   private readonly logger = new Logger(OutboxPublisherService.name);
   private pollTimer: NodeJS.Timeout | null = null;
   private isProcessing = false;
   private readonly pollIntervalMs = 3000;
   private readonly maxRetries = 5;

   constructor(
      @Inject(OUTBOX_REPOSITORY)
      private readonly outboxRepository: IOutboxRepository,
      @Inject(SERVICES.NOTIFICATION_SERVICE)
      private readonly notificationClient: ClientProxy,
      @Inject(SERVICES.USER_SERVICE)
      private readonly userClient: ClientProxy,
   ) {}

   onModuleInit(): void {
      this.startPolling();
   }

   onModuleDestroy(): void {
      this.stopPolling();
   }

   startPolling(): void {
      if (this.pollTimer) return;
      this.logger.log(`Starting Outbox Publisher poller (interval: ${this.pollIntervalMs}ms)`);
      this.pollTimer = setInterval(() => {
         void this.publishPendingEvents();
      }, this.pollIntervalMs);
   }

   stopPolling(): void {
      if (this.pollTimer) {
         clearInterval(this.pollTimer);
         this.pollTimer = null;
         this.logger.log('Outbox Publisher poller stopped');
      }
   }

   triggerPublish(): void {
      setImmediate(() => {
         void this.publishPendingEvents();
      });
   }

   async publishPendingEvents(): Promise<number> {
      if (this.isProcessing) return 0;
      this.isProcessing = true;

      try {
         const pendingEvents = await this.outboxRepository.findPending(20);
         if (pendingEvents.length === 0) {
            return 0;
         }

         this.logger.log(`Processing ${pendingEvents.length} pending outbox event(s)`);
         await this.outboxRepository.markAsProcessing(pendingEvents.map((e) => e.eventId));

         let successCount = 0;
         for (const event of pendingEvents) {
            try {
               await Promise.allSettled([
                  firstValueFrom(this.notificationClient.emit(event.eventType, event.payload)),
                  firstValueFrom(this.userClient.emit(event.eventType, event.payload)),
               ]);
               await this.outboxRepository.markAsPublished(event.eventId);
               this.logger.log(`Outbox event published successfully: [${event.eventType}] ID: ${event.eventId}`);
               successCount++;
            } catch (err: unknown) {
               const errMsg = err instanceof Error ? err.message : String(err);
               this.logger.error(`Failed to publish outbox event ${event.eventId} (${event.eventType}): ${errMsg}`);
               await this.outboxRepository.markAsFailed(event.eventId, errMsg, this.maxRetries);
            }
         }

         return successCount;
      } catch (err: unknown) {
         const errMsg = err instanceof Error ? err.message : String(err);
         this.logger.error(`Error during outbox processing cycle: ${errMsg}`);
         return 0;
      } finally {
         this.isProcessing = false;
      }
   }
}
