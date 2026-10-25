import { Message, MessageProperties } from 'amqplib';
import { RmqErrorAction } from '@common/rmq/rmq.constants';

export interface XDeathHeaderEntry {
   count?: number;
   reason?: string;
   queue?: string;
   time?: Date;
   exchange?: string;
   'routing-keys'?: string[];
}

export interface TrackedMessageProperties extends Omit<MessageProperties, 'headers'> {
   headers: Record<string, unknown>;
}

export interface TrackedMessage extends Omit<Message, 'properties'> {
   __acked?: boolean;
   properties: TrackedMessageProperties;
}

export interface IRmqQueueOptions {
   noAck?: boolean;
   durable?: boolean;
   withDlx?: boolean;
   dlxExchange?: string;
   dlxRoutingKey?: string;
   dlqQueue?: string;
   maxPriority?: number;
   prefetchCount?: number;
   isGlobalPrefetchCount?: boolean;
   arguments?: Record<string, unknown>;
}

export enum RmqErrorKind {
   POISON = 'POISON',
   TRANSIENT = 'TRANSIENT',
}

export interface IRmqErrorHandlerOptions {
   queue?: string;
   maxRetries?: number;
   backoffDelaysMs?: readonly number[] | number[];
   customClassifier?: (error: unknown) => RmqErrorKind;
}

export interface RmqErrorHandlingResult {
   action: RmqErrorAction;
   retries: number;
   delayMs?: number;
}
