import { Injectable } from '@nestjs/common';
import { RmqContext, RmqOptions, Transport } from '@nestjs/microservices';
import { Channel, Message } from 'amqplib';
import { AppConfigService } from '@common/config';

interface TrackedMessage extends Message {
   __acked?: boolean;
}

@Injectable()
export class RmqService {
   constructor(private readonly config: AppConfigService) {}

   getOptions(queue: string, noAck = false): RmqOptions {
      const urls = [this.config.rabbitMq.uri];

      return {
         transport: Transport.RMQ,
         options: {
            urls,
            queue: this.config.rabbitMq.getQueue(queue),
            noAck,
            persistent: true,
            queueOptions: {
               durable: true,
            },
         },
      };
   }

   ack(context?: RmqContext) {
      if (!context) {
         return;
      }
      try {
         const channel = context.getChannelRef() as Channel | undefined;
         const originalMessage = context.getMessage() as TrackedMessage | undefined;
         if (!channel || !originalMessage || originalMessage.__acked) {
            return;
         }
         originalMessage.__acked = true;
         channel.ack(originalMessage);
      } catch {
         // Silently ignore if channel is already closed or message already acknowledged
      }
   }

   nack(context?: RmqContext, requeue = false) {
      if (!context) {
         return;
      }
      try {
         const channel = context.getChannelRef() as Channel | undefined;
         const originalMessage = context.getMessage() as TrackedMessage | undefined;
         if (!channel || !originalMessage || originalMessage.__acked) {
            return;
         }
         originalMessage.__acked = true;
         channel.nack(originalMessage, false, requeue);
      } catch {
         // Silently ignore if channel is already closed or message already acknowledged
      }
   }
}
