import { Inject, Injectable, Logger } from '@nestjs/common';
import { USER_EVENT_STORE } from '@user/cqrs/constants/user-cqrs.constant';
import type { IUserEventStore } from '@user/cqrs/write/user-event-store.interface';
import { UserActivityProjection, UserProfileProjection, UserStatsProjection } from '@user/cqrs/read';

export interface RebuildProjectionsOptions {
   batchSize?: number;
   fromVersion?: number;
   resetBeforeRebuild?: boolean;
}

export interface RebuildProjectionsResult {
   replayedCount: number;
   durationMs: number;
}

@Injectable()
export class UserProjectionRebuildService {
   private readonly logger = new Logger(UserProjectionRebuildService.name);

   constructor(
      @Inject(USER_EVENT_STORE)
      private readonly eventStore: IUserEventStore,
      private readonly userStatsProjection: UserStatsProjection,
      private readonly userProfileProjection: UserProfileProjection,
      private readonly userActivityProjection: UserActivityProjection,
   ) {}

   /**
    * Replays event store streams in sequence to rebuild all CQRS projections from scratch.
    */
   async rebuildAll(options: RebuildProjectionsOptions = {}): Promise<RebuildProjectionsResult> {
      const startTime = Date.now();
      const batchSize = Math.max(options.batchSize || 100, 1);
      let fromVersion = options.fromVersion ?? 0;
      let totalReplayed = 0;

      if (options.resetBeforeRebuild) {
         this.logger.log('Resetting all projections prior to replay...');
         await Promise.allSettled([this.userStatsProjection.resetAll(), this.userActivityProjection.resetAll()]);
      }

      this.logger.log(`Starting user projection rebuild from version ${fromVersion}...`);

      while (true) {
         const events = await this.eventStore.getAllEvents({
            fromVersion,
            take: batchSize,
         });

         if (events.length === 0) {
            break;
         }

         for (const event of events) {
            await Promise.allSettled([
               this.userStatsProjection.project(event),
               this.userProfileProjection.project(event),
               this.userActivityProjection.project(event),
            ]);

            totalReplayed++;
            fromVersion = event.version + 1;
         }

         if (events.length < batchSize) {
            break;
         }
      }

      const durationMs = Date.now() - startTime;
      this.logger.log(`Completed user projection rebuild: ${totalReplayed} events in ${durationMs}ms`);

      return {
         replayedCount: totalReplayed,
         durationMs,
      };
   }
}
