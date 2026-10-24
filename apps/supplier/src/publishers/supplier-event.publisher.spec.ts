import { EventEmitter2 } from '@nestjs/event-emitter';
import { of } from 'rxjs';
import { RBAC_INTERNAL_PATTERNS } from '@common';
import { NOTIFICATION_EVENTS } from '@contracts/notification';
import { SUPPLIER_EVENTS, SUPPLIER_ROLES } from '@contracts/supplier';
import { SupplierEventPublisher } from '@supplier/publishers/supplier-event.publisher';

describe('SupplierEventPublisher', () => {
   let publisher: SupplierEventPublisher;
   let mockAuthClient: { emit: jest.Mock };
   let mockNotificationClient: { emit: jest.Mock };
   let mockEventEmitter: { emit: jest.Mock };

   beforeEach(() => {
      mockAuthClient = {
         emit: jest.fn().mockReturnValue(of(true)),
      };
      mockNotificationClient = {
         emit: jest.fn().mockReturnValue(of(true)),
      };
      mockEventEmitter = {
         emit: jest.fn(),
      };

      publisher = new SupplierEventPublisher(
         mockAuthClient as any,
         mockNotificationClient as any,
         mockEventEmitter as unknown as EventEmitter2,
      );
   });

   it('should publish role elevation event to auth service and notification event when email is present', async () => {
      const eventPayload = {
         accountId: 'acc-123',
         supplierId: 'sup-456',
         role: SUPPLIER_ROLES.SUPPLIER_ADMIN,
         email: 'admin@supplier.com',
         supplierName: 'Organic Greens Co.',
      };

      await publisher.publishOnboardingCompleted(eventPayload);

      expect(mockAuthClient.emit).toHaveBeenCalledWith(
         RBAC_INTERNAL_PATTERNS.SUPPLIER_ONBOARDING_COMPLETED,
         eventPayload,
      );
      expect(mockNotificationClient.emit).toHaveBeenCalledWith(NOTIFICATION_EVENTS.SUPPLIER_REGISTERED, {
         email: eventPayload.email,
         accountId: eventPayload.accountId,
         supplierId: eventPayload.supplierId,
         role: eventPayload.role,
         supplierName: eventPayload.supplierName,
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(SUPPLIER_EVENTS.SUPPLIER_ONBOARDING_COMPLETED, eventPayload);
   });

   it('should not emit notification event if email is not provided', async () => {
      const eventPayload = {
         accountId: 'acc-123',
         supplierId: 'sup-456',
         role: SUPPLIER_ROLES.SUPPLIER_ADMIN,
      };

      await publisher.publishOnboardingCompleted(eventPayload);

      expect(mockAuthClient.emit).toHaveBeenCalledWith(
         RBAC_INTERNAL_PATTERNS.SUPPLIER_ONBOARDING_COMPLETED,
         eventPayload,
      );
      expect(mockNotificationClient.emit).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(SUPPLIER_EVENTS.SUPPLIER_ONBOARDING_COMPLETED, eventPayload);
   });
});
