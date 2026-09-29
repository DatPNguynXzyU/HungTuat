import { Injectable, Logger } from '@nestjs/common';
import { GraphFollowRepository } from '@user/graph';
import { UserEntity } from '@user/entities';

/**
 * Service to sync user data to NebulaGraph
 */
@Injectable()
export class UserGraphSyncService {
   private readonly logger = new Logger(UserGraphSyncService.name);

   constructor(private readonly graphFollowRepository: GraphFollowRepository) {}

   async syncUserToGraph(user: UserEntity): Promise<void> {
      try {
         await this.graphFollowRepository.createOrUpdateUser({
            userId: user.id,
            username: user.username || undefined,
            displayName: user.displayName || undefined,
            avatar: user.avatar || undefined,
            isPrivate: user.isPrivate,
         });

         this.logger.debug(`User ${user.id} synced to graph`);
      } catch (error) {
         this.logger.error(`Failed to sync user ${user.id} to graph`, error);
         throw error;
      }
   }

   async syncUsersToGraph(users: UserEntity[]): Promise<void> {
      for (const user of users) {
         await this.syncUserToGraph(user);
      }
   }
}
