import { Inject, Injectable, Logger } from '@nestjs/common';
import { USER_EVENTS } from '@contracts/user';
import { UserEntity } from '@user/entities';
import { SEARCH_ADAPTER, type ISearchAdapter } from '@user/adapters/search';
import { USER_METRICS_LOG_MESSAGES } from '@user/constants';

@Injectable()
export class UserIndexListener {
   private readonly logger = new Logger(UserIndexListener.name);

   constructor(
      @Inject(SEARCH_ADAPTER)
      private readonly searchAdapter: ISearchAdapter,
   ) {}

   emitSearchIndexEvent(event: string, user: UserEntity): void {
      try {
         this.searchAdapter.emitIndexEvent(event, {
            userId: user.userId,
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
         this.logger.warn(
            `${USER_METRICS_LOG_MESSAGES.EMIT_INDEX_EVENT_FAILED} [${event}] user [${user.userId}]: ${String(err)}`,
         );
      }
   }

   emitSearchDeleteEvent(userId: string): void {
      try {
         this.searchAdapter.emitIndexEvent(USER_EVENTS.DELETED, { userId });
      } catch (err) {
         this.logger.warn(
            `${USER_METRICS_LOG_MESSAGES.EMIT_INDEX_EVENT_FAILED} [${USER_EVENTS.DELETED}] user [${userId}]: ${String(err)}`,
         );
      }
   }
}
