import { USER_EVENTS } from '@contracts/user';
import { UserEntity, UserStatus } from '@user/core/database/entities';
import { UserIndexListener } from '@user/modules/search/listeners/user-index.listener';
import type { ISearchAdapter } from '@user/adapters/search';

describe('UserIndexListener', () => {
   let listener: UserIndexListener;
   let searchAdapter: jest.Mocked<ISearchAdapter>;

   beforeEach(() => {
      searchAdapter = {
         searchUsers: jest.fn(),
         emitIndexEvent: jest.fn(),
      };

      listener = new UserIndexListener(searchAdapter);
   });

   it('should emit search index event with user data', () => {
      const user = new UserEntity({
         userId: 'u1',
         accountId: 'acc1',
         username: 'john_doe',
         displayName: 'John Doe',
         avatar: 'https://example.com/avatar.jpg',
         bio: 'Hello world',
         status: UserStatus.ACTIVE,
      });

      listener.emitSearchIndexEvent(USER_EVENTS.CREATED, user);

      expect(searchAdapter.emitIndexEvent).toHaveBeenCalledWith(
         USER_EVENTS.CREATED,
         expect.objectContaining({
            userId: 'u1',
            username: 'john_doe',
            displayName: 'John Doe',
            avatar: 'https://example.com/avatar.jpg',
            bio: 'Hello world',
         }),
      );
   });

   it('should emit search delete event with userId', () => {
      listener.emitSearchDeleteEvent('u1');

      expect(searchAdapter.emitIndexEvent).toHaveBeenCalledWith(USER_EVENTS.DELETED, { userId: 'u1' });
   });

   it('should catch error without throwing when search adapter fails', () => {
      searchAdapter.emitIndexEvent.mockImplementationOnce(() => {
         throw new Error('Adapter error');
      });

      expect(() => {
         listener.emitSearchDeleteEvent('u1');
      }).not.toThrow();
   });
});
