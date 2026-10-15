import { Controller } from '@nestjs/common';
import { Ctx, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { CommandBus, RmqService } from '@common';
import { USER_PATTERNS } from '@contracts/user';
import { SearchUsersCommand } from '@user/commands/search';

/**
 * SearchController acts as a transport adapter dispatching commands
 * to the CommandBus layer, decoupling the transport layer from concrete services.
 */
@Controller()
export class SearchController {
   constructor(
      private readonly commandBus: CommandBus,
      private readonly rmqService: RmqService,
   ) {}

   @MessagePattern({ cmd: USER_PATTERNS.SEARCH_USERS })
   async searchUsers(
      @Payload() data: { query: string; limit?: number; cursor?: string; currentUserId?: string },
      @Ctx() context?: RmqContext,
   ) {
      try {
         const result = await this.commandBus.execute(
            new SearchUsersCommand(data.query, data.limit, data.cursor, data.currentUserId),
         );
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
