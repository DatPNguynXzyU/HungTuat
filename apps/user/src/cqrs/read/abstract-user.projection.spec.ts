import { AbstractUserProjection } from '@user/cqrs/read/abstract-user.projection';
import type { UserStoredEvent } from '@user/cqrs/write/user-event.interface';
import { USER_CQRS_LOG_MESSAGES } from '@user/cqrs/constants/user-cqrs.constant';

class ConcreteTestProjection extends AbstractUserProjection {
   public projectedEvents: UserStoredEvent[] = [];
   public hookSuccessEvents: UserStoredEvent[] = [];
   public hookErrorEvents: { event: UserStoredEvent; error: unknown }[] = [];
   public shouldThrow = false;

   protected getProjectionName(): string {
      return 'TEST_PROJECTION';
   }

   async project(event: UserStoredEvent): Promise<void> {
      await Promise.resolve();
      if (this.shouldThrow) {
         throw new Error('Database projection failure');
      }
      this.projectedEvents.push(event);
   }

   protected override onProjected(event: UserStoredEvent): void {
      this.hookSuccessEvents.push(event);
   }

   protected override onProjectError(event: UserStoredEvent, error: unknown): void {
      this.hookErrorEvents.push({ event, error });
   }
}

describe('AbstractUserProjection', () => {
   let projection: ConcreteTestProjection;

   const mockEvent: UserStoredEvent = {
      eventId: 'evt-123',
      streamId: 'user-user-1',
      eventType: 'USER.CREATED',
      version: 1,
      data: { userId: 'user-1' },
      metadata: { timestamp: new Date().toISOString() },
      createdAt: new Date(),
   };

   beforeEach(() => {
      projection = new ConcreteTestProjection();
   });

   it('should execute project and invoke onProjected hook on success', async () => {
      await projection.handleEvent(mockEvent);

      expect(projection.projectedEvents).toHaveLength(1);
      expect(projection.projectedEvents[0]).toEqual(mockEvent);
      expect(projection.hookSuccessEvents).toHaveLength(1);
      expect(projection.hookSuccessEvents[0]).toEqual(mockEvent);
      expect(projection.hookErrorEvents).toHaveLength(0);
   });

   it('should intercept error, invoke onProjectError hook, and log formatted error without rethrowing', async () => {
      projection.shouldThrow = true;
      const loggerSpy = jest
         .spyOn((projection as unknown as { logger: { error: jest.Mock } }).logger, 'error')
         .mockImplementation();

      await expect(projection.handleEvent(mockEvent)).resolves.not.toThrow();

      expect(projection.hookSuccessEvents).toHaveLength(0);
      expect(projection.hookErrorEvents).toHaveLength(1);
      expect(projection.hookErrorEvents[0].event).toEqual(mockEvent);
      expect((projection.hookErrorEvents[0].error as Error).message).toBe('Database projection failure');

      expect(loggerSpy).toHaveBeenCalledWith(
         expect.stringContaining(USER_CQRS_LOG_MESSAGES.PROJECTION_FAILED),
         expect.any(String),
      );
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('[TEST_PROJECTION]'), expect.any(String));
   });
});
