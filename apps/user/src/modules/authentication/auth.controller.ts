import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { RmqService } from '@common';
import { NOTIFICATION_EVENTS } from '@contracts/notification';
import { USER_PATTERNS } from '@contracts/user';
import { AuthService } from './auth.service';

@Controller()
export class AuthController {
   constructor(
      private readonly authService: AuthService,
      private readonly rmqService: RmqService,
   ) {}

   @EventPattern(NOTIFICATION_EVENTS.USER_REGISTERED)
   async handleUserRegistered(@Payload() data: { accountId: string; email?: string }, @Ctx() context?: RmqContext) {
      try {
         const result = await this.authService.handleUserRegistered(data);
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
         const result = await this.authService.checkUsername(data.username);
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
