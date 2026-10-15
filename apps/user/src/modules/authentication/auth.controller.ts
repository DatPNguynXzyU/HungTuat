import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { CommandBus, RmqService } from '@common';
import { NOTIFICATION_EVENTS } from '@contracts/notification';
import { USER_PATTERNS } from '@contracts/user';
import { CheckUsernameCommand, HandleUserRegisteredCommand } from '@user/commands/authentication';

/**
 * AuthController acts as a transport adapter dispatching commands
 * to the CommandBus layer, decoupling the transport layer from concrete services.
 */
@Controller()
export class AuthController {
   constructor(
      private readonly commandBus: CommandBus,
      private readonly rmqService: RmqService,
   ) {}

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

   @MessagePattern({ cmd: USER_PATTERNS.CHECK_USERNAME })
   async checkUsername(@Payload() data: { username: string }, @Ctx() context?: RmqContext) {
      try {
         const result = await this.commandBus.execute(new CheckUsernameCommand(data.username));
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
