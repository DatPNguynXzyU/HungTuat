import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { AppLogger, RmqService } from '@common';
import { USER_EVENTS, USER_PATTERNS } from '@contracts/user';
import { SEARCH_PATTERNS } from '@contracts/search';
import { UserSearchService } from '@search/domains/user-search/user-search.service';
import { BulkIndexQueue } from '@search/core/queue';

export interface UserEventPayload {
   id: string;
   email?: string | null;
   username?: string | null;
   displayName?: string | null;
   avatar?: string | null;
   bio?: string | null;
   isVerified?: boolean;
   followersCount?: number;
   followingCount?: number;
   createdAt?: Date;
   updatedAt?: Date;
}

export interface UserDeletedPayload {
   id: string;
}

export interface SearchUsersPayload {
   query: string;
   limit?: number;
   cursor?: string;
}

@Controller()
export class UserSearchController {
   constructor(
      private readonly userSearchService: UserSearchService,
      private readonly bulkQueue: BulkIndexQueue,
      private readonly rmqService: RmqService,
      private readonly logger: AppLogger,
   ) {
      this.logger.setContext(UserSearchController.name);
   }

   @EventPattern(USER_EVENTS.CREATED)
   async handleUserCreated(@Payload() data: UserEventPayload, @Ctx() context?: RmqContext): Promise<void> {
      try {
         this.logger.log(`Received ${USER_EVENTS.CREATED} event for user ${data.id}`);
         await this.bulkQueue.addOperation({
            operation: 'index',
            index: 'users',
            id: data.id,
            data: {
               id: data.id,
               email: data.email,
               username: data.username,
               displayName: data.displayName,
               avatar: data.avatar,
               bio: data.bio,
               isVerified: data.isVerified ?? false,
               followersCount: data.followersCount ?? 0,
               followingCount: data.followingCount ?? 0,
               createdAt: data.createdAt ?? new Date(),
               updatedAt: data.updatedAt ?? new Date(),
            },
         });
         if (context) {
            this.rmqService.ack(context);
         }
      } catch (error) {
         this.logger.error(`Error queuing ${USER_EVENTS.CREATED}`, error instanceof Error ? error.stack : undefined);
         if (context) {
            this.rmqService.nack(context, false);
         }
      }
   }

   @EventPattern(USER_EVENTS.UPDATED)
   async handleUserUpdated(@Payload() data: UserEventPayload, @Ctx() context?: RmqContext): Promise<void> {
      try {
         this.logger.log(`Received ${USER_EVENTS.UPDATED} event for user ${data.id}`);
         await this.bulkQueue.addOperation({
            operation: 'update',
            index: 'users',
            id: data.id,
            data: {
               doc: {
                  email: data.email,
                  username: data.username,
                  displayName: data.displayName,
                  avatar: data.avatar,
                  bio: data.bio,
                  isVerified: data.isVerified,
                  followersCount: data.followersCount,
                  followingCount: data.followingCount,
                  updatedAt: data.updatedAt ?? new Date(),
               },
            },
         });
         if (context) {
            this.rmqService.ack(context);
         }
      } catch (error) {
         this.logger.error(`Error queuing ${USER_EVENTS.UPDATED}`, error instanceof Error ? error.stack : undefined);
         if (context) {
            this.rmqService.nack(context, false);
         }
      }
   }

   @EventPattern(USER_EVENTS.DELETED)
   async handleUserDeleted(@Payload() data: UserDeletedPayload, @Ctx() context?: RmqContext): Promise<void> {
      try {
         this.logger.log(`Received ${USER_EVENTS.DELETED} event for user ${data.id}`);
         await this.bulkQueue.addOperation({
            operation: 'delete',
            index: 'users',
            id: data.id,
         });
         if (context) {
            this.rmqService.ack(context);
         }
      } catch (error) {
         this.logger.error(`Error queuing ${USER_EVENTS.DELETED}`, error instanceof Error ? error.stack : undefined);
         if (context) {
            this.rmqService.nack(context, false);
         }
      }
   }

   @EventPattern(USER_EVENTS.SYNC)
   async handleUserSync(@Payload() data: UserEventPayload, @Ctx() context?: RmqContext): Promise<void> {
      try {
         this.logger.log(`Received ${USER_EVENTS.SYNC} event for user ${data.id}`);
         await this.bulkQueue.addOperation({
            operation: 'index',
            index: 'users',
            id: data.id,
            data: {
               id: data.id,
               email: data.email,
               username: data.username,
               displayName: data.displayName,
               avatar: data.avatar,
               bio: data.bio,
               isVerified: data.isVerified ?? false,
               followersCount: data.followersCount ?? 0,
               followingCount: data.followingCount ?? 0,
               createdAt: data.createdAt ?? new Date(),
               updatedAt: data.updatedAt ?? new Date(),
            },
         });
         if (context) {
            this.rmqService.ack(context);
         }
      } catch (error) {
         this.logger.error(`Error queuing ${USER_EVENTS.SYNC}`, error instanceof Error ? error.stack : undefined);
         if (context) {
            this.rmqService.nack(context, false);
         }
      }
   }

   @MessagePattern({ cmd: SEARCH_PATTERNS.SEARCH_USERS })
   async searchUsersViaSearchPattern(@Payload() data: SearchUsersPayload, @Ctx() context?: RmqContext) {
      try {
         const result = await this.userSearchService.searchUsers(data.query, data.limit, data.cursor);
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

   @MessagePattern({ cmd: USER_PATTERNS.SEARCH_USERS })
   async searchUsersViaUserPattern(@Payload() data: SearchUsersPayload, @Ctx() context?: RmqContext) {
      try {
         const result = await this.userSearchService.searchUsers(data.query, data.limit, data.cursor);
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
