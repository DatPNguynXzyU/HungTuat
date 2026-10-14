import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { SERVICES } from '@common';
import { USER_EVENTS } from '@contracts/user';
import { UserEntity } from '@user/core/database/entities';

@Injectable()
export class UserIndexListener {
   private readonly logger = new Logger(UserIndexListener.name);

   constructor(
      @Inject(SERVICES.SEARCH_SERVICE)
      private readonly searchClient: ClientProxy,
   ) {}

   emitSearchIndexEvent(event: string, user: UserEntity): void {
      try {
         this.searchClient.emit(event, {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatar: user.avatar,
            bio: user.bio,
            isVerified: user.isVerified,
            followersCount: user.followersCount,
            followingCount: user.followingCount,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
         });
      } catch (err) {
         this.logger.warn(`Failed to emit ${event} to Search Service for user ${user.id}: ${String(err)}`);
      }
   }

   emitSearchDeleteEvent(userId: string): void {
      try {
         this.searchClient.emit(USER_EVENTS.DELETED, { id: userId });
      } catch (err) {
         this.logger.warn(`Failed to emit ${USER_EVENTS.DELETED} to Search Service for user ${userId}: ${String(err)}`);
      }
   }
}
