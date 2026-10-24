import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ISupplierOnboardingCompletedEvent, RBAC_INTERNAL_PATTERNS, SERVICES } from '@common';
import { NOTIFICATION_EVENTS } from '@contracts/notification';
import { SUPPLIER_EVENTS } from '@contracts/supplier';
import type { ISupplierEventPublisher } from '@supplier/publishers/supplier-event.publisher.interface';

@Injectable()
export class SupplierEventPublisher implements ISupplierEventPublisher {
   private readonly logger = new Logger(SupplierEventPublisher.name);

   constructor(
      @Inject(SERVICES.AUTH_SERVICE)
      private readonly authClient: ClientProxy,
      @Inject(SERVICES.NOTIFICATION_SERVICE)
      private readonly notificationClient: ClientProxy,
      private readonly eventEmitter: EventEmitter2,
   ) {}

   publishOnboardingCompleted(event: ISupplierOnboardingCompletedEvent): Promise<void> {
      try {
         // Role elevation in Auth Service
         this.authClient.emit(RBAC_INTERNAL_PATTERNS.SUPPLIER_ONBOARDING_COMPLETED, event);

         // Notification service for supplier welcome email
         if (event.email) {
            this.notificationClient.emit(NOTIFICATION_EVENTS.SUPPLIER_REGISTERED, {
               email: event.email,
               accountId: event.accountId,
               supplierId: event.supplierId,
               role: event.role,
               supplierName: event.supplierName,
            });
         }

         // In-process domain event
         this.eventEmitter.emit(SUPPLIER_EVENTS.SUPPLIER_ONBOARDING_COMPLETED, event);

         this.logger.log(
            `Published onboarding completed events for account ${event.accountId}, supplier ${event.supplierId}`,
         );
         return Promise.resolve();
      } catch (error) {
         const err = error instanceof Error ? error : new Error(String(error));
         this.logger.error(
            `Failed to publish onboarding completed event for account ${event.accountId}: ${err.message}`,
         );
         return Promise.reject(err);
      }
   }
}
