import { Controller, Get } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { CommandBus, QUEUES, RmqService } from '@common';
import { NOTIFICATION_EVENTS } from '@contracts/notification';
import { HandleUserRegisteredCommand } from '@user/commands';

@Controller('users')
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
            await this.rmqService.handleError(error, context, { queue: QUEUES.USER });
         }
         throw error;
      }
   }
}
