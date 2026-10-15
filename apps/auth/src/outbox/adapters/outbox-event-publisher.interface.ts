export const OUTBOX_EVENT_PUBLISHER = Symbol('OUTBOX_EVENT_PUBLISHER');

/**
 * Port contract for publishing outbox integration events to external message brokers.
 * Decouples outbox polling and state tracking from specific messaging transports (e.g., RabbitMQ ClientProxy).
 */
export interface IOutboxEventPublisher {
   /**
    * Publishes an integration event to external message consumers.
    * @param eventType Name or topic of the integration event
    * @param payload Payload data associated with the event
    */
   publish(eventType: string, payload: unknown): Promise<void>;
}
