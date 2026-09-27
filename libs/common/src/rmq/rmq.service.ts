import { Injectable } from '@nestjs/common';
import { RmqContext, RmqOptions, Transport } from '@nestjs/microservices';
import { Channel, Message } from 'amqplib';
import { AppConfigService } from '@common/config';

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

   ack(context: RmqContext) {
      const channel = context.getChannelRef() as Channel;
      const originalMessage = context.getMessage() as Message;
      channel.ack(originalMessage);
   }
}
