import type { ISupplierOnboardingCompletedEvent } from '@common';

export const SUPPLIER_EVENT_PUBLISHER = Symbol('ISupplierEventPublisher');

export interface ISupplierEventPublisher {
   publishOnboardingCompleted(event: ISupplierOnboardingCompletedEvent): Promise<void>;
}
