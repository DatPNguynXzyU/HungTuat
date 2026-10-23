import { Controller, Get } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { CommandBus, RmqService } from '@common';
import { NOTIFICATION_EVENTS } from '@contracts/notification';
import { HandleUserRegisteredCommand } from '@user/commands/authentication';

/**
 * UserController handles incoming asynchronous events via RabbitMQ
 * for the User microservice, dedicated exclusively to event-driven processing.
 * All synchronous request-response communication is handled by UserGrpcController.
 */
@Controller()
export class UserController {
   constructor(
      private readonly commandBus: CommandBus,
      private readonly rmqService: RmqService,
   ) {}

   @Get(['', 'health'])
   healthCheck() {
      return { status: 'ok', service: 'user', timestamp: new Date().toISOString() };
   }

   /*
    -- Authentication & Registration Asynchronous Events --
   */

   @EventPattern(NOTIFICATION_EVENTS.USER_REGISTERED)
   async handleUserRegistered(@Payload() data: { accountId: string; email?: string }, @Ctx() context?: RmqContext) {
      try {
         const result = await this.commandBus.execute(new HandleUserRegisteredCommand(data));
         if (context) {
            this.rmqService.ack(context);
         }
         return result;
      } catch (error) {
         if (context) {
            this.rmqService.ack(context);
         }
         throw error;
      }
   }
}
