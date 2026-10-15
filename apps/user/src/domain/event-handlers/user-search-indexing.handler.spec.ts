import { USER_EVENTS } from '@contracts/user';
import { UserSearchIndexingHandler } from '@user/domain/event-handlers/user-search-indexing.handler';
import { UserCreatedEvent, UserUpdatedEvent, UserDeletedEvent, UserRestoredEvent } from '@user/domain/events';
import type { ISearchAdapter } from '@user/adapters/search';

describe('UserSearchIndexingHandler', () => {
   let handler: UserSearchIndexingHandler;
   let searchAdapter: jest.Mocked<ISearchAdapter>;

   beforeEach(() => {
      searchAdapter = {
         searchUsers: jest.fn(),
         emitIndexEvent: jest.fn(),
      };

      handler = new UserSearchIndexingHandler(searchAdapter);
   });

   it('should emit user created search event on UserCreatedEvent', () => {
      const event = new UserCreatedEvent('u1', 'acc1', 'john_doe', 'John Doe');
      handler.handleUserCreated(event);

      expect(searchAdapter.emitIndexEvent).toHaveBeenCalledWith(
         USER_EVENTS.CREATED,
         expect.objectContaining({
            userId: 'u1',
            username: 'john_doe',
            displayName: 'John Doe',
         }),
      );
   });

   it('should emit user updated search event on UserUpdatedEvent', () => {
      const event = new UserUpdatedEvent('u1', 'acc1', { bio: 'New bio' });
      handler.handleUserUpdated(event);

      expect(searchAdapter.emitIndexEvent).toHaveBeenCalledWith(
         USER_EVENTS.UPDATED,
         expect.objectContaining({
            userId: 'u1',
            bio: 'New bio',
         }),
      );
   });

   it('should emit user deleted search event on UserDeletedEvent', () => {
      const event = new UserDeletedEvent('u1', 'acc1');
      handler.handleUserDeleted(event);

      expect(searchAdapter.emitIndexEvent).toHaveBeenCalledWith(
         USER_EVENTS.DELETED,
         expect.objectContaining({
            userId: 'u1',
         }),
      );
   });

   it('should emit user restored search event on UserRestoredEvent', () => {
      const event = new UserRestoredEvent('u1', 'acc1');
      handler.handleUserRestored(event);

      expect(searchAdapter.emitIndexEvent).toHaveBeenCalledWith(
         USER_EVENTS.CREATED,
         expect.objectContaining({
            userId: 'u1',
            accountId: 'acc1',
         }),
      );
   });

   it('should catch error without throwing when search adapter fails', () => {
      searchAdapter.emitIndexEvent.mockImplementationOnce(() => {
         throw new Error('Adapter emission failed');
      });

      expect(() => {
         handler.handleUserCreated(new UserCreatedEvent('u1', 'acc1'));
      }).not.toThrow();
   });
});
