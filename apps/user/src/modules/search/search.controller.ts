import { Controller } from '@nestjs/common';
import { Ctx, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { RmqService } from '@common';
import { USER_PATTERNS } from '@contracts/user';
import { UserSearchService } from './user-search.service';

@Controller()
export class SearchController {
   constructor(
      private readonly userSearchService: UserSearchService,
      private readonly rmqService: RmqService,
   ) {}

   @MessagePattern({ cmd: USER_PATTERNS.SEARCH_USERS })
   async searchUsers(
      @Payload() data: { query: string; limit?: number; cursor?: string; currentUserId?: string },
      @Ctx() context?: RmqContext,
   ) {
      try {
         const result = await this.userSearchService.searchUsers(
            data.query,
            data.limit,
            data.cursor,
            data.currentUserId,
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
