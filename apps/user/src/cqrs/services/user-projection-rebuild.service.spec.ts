import { Test, type TestingModule } from '@nestjs/testing';
import { UserProjectionRebuildService } from '@user/cqrs/services/user-projection-rebuild.service';
import { USER_EVENT_STORE } from '@user/cqrs/constants/user-cqrs.constant';
import { UserActivityProjection, UserProfileProjection, UserStatsProjection } from '@user/cqrs/read';
import { USER_DOMAIN_EVENTS } from '@user/domain/events';
import type { UserStoredEvent } from '@user/cqrs/write/user-event.interface';

describe('UserProjectionRebuildService', () => {
   let service: UserProjectionRebuildService;
   let mockEventStore: {
      getAllEvents: jest.Mock;
   };
   let mockUserStatsProjection: {
      project: jest.Mock;
      resetAll: jest.Mock;
   };
   let mockUserProfileProjection: {
      project: jest.Mock;
   };
   let mockUserActivityProjection: {
      project: jest.Mock;
      resetAll: jest.Mock;
   };

   beforeEach(async () => {
      mockEventStore = {
         getAllEvents: jest.fn(),
      };
      mockUserStatsProjection = {
         project: jest.fn().mockResolvedValue(undefined),
         resetAll: jest.fn().mockResolvedValue(undefined),
      };
      mockUserProfileProjection = {
         project: jest.fn().mockResolvedValue(undefined),
      };
      mockUserActivityProjection = {
         project: jest.fn().mockResolvedValue(undefined),
         resetAll: jest.fn().mockResolvedValue(undefined),
      };

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            UserProjectionRebuildService,
            { provide: USER_EVENT_STORE, useValue: mockEventStore },
            { provide: UserStatsProjection, useValue: mockUserStatsProjection },
            { provide: UserProfileProjection, useValue: mockUserProfileProjection },
            { provide: UserActivityProjection, useValue: mockUserActivityProjection },
         ],
      }).compile();

      service = module.get<UserProjectionRebuildService>(UserProjectionRebuildService);
   });

   it('should replay all events across all projections', async () => {
      const mockEvents: UserStoredEvent[] = [
         {
            eventId: 'e1',
            streamId: 'user-u1',
            eventType: USER_DOMAIN_EVENTS.USER_CREATED,
            version: 1,
            data: { userId: 'u1' },
            metadata: { timestamp: '2026-01-01' },
            createdAt: new Date(),
         },
         {
            eventId: 'e2',
            streamId: 'user-u1',
            eventType: USER_DOMAIN_EVENTS.USER_UPDATED,
            version: 2,
            data: { userId: 'u1' },
            metadata: { timestamp: '2026-01-01' },
            createdAt: new Date(),
         },
      ];

      mockEventStore.getAllEvents.mockResolvedValueOnce(mockEvents).mockResolvedValueOnce([]);

      const result = await service.rebuildAll({ batchSize: 2, resetBeforeRebuild: true });

      expect(mockUserStatsProjection.resetAll).toHaveBeenCalled();
      expect(mockUserActivityProjection.resetAll).toHaveBeenCalled();
      expect(mockUserStatsProjection.project).toHaveBeenCalledTimes(2);
      expect(mockUserProfileProjection.project).toHaveBeenCalledTimes(2);
      expect(mockUserActivityProjection.project).toHaveBeenCalledTimes(2);
      expect(result.replayedCount).toBe(2);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
   });
});
