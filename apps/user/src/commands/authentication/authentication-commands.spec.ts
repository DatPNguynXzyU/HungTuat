import { UserEntity, UserStatus } from '@user/core/database/entities';
import type { AuthService } from '@user/services/domain/auth.service';
import {
   CheckUsernameCommand,
   CheckUsernameHandler,
   HandleUserRegisteredCommand,
   HandleUserRegisteredHandler,
} from '@user/commands/authentication';

describe('Authentication Command Handlers', () => {
   let authService: jest.Mocked<Partial<AuthService>>;

   const mockUser = new UserEntity({
      id: 'u-1',
      userId: 'u-1',
      accountId: 'acc-1',
      username: 'john_doe',
      status: UserStatus.ACTIVE,
   });

   beforeEach(() => {
      authService = {
         checkUsername: jest.fn().mockResolvedValue({ available: true, username: 'john_doe' }),
         handleUserRegistered: jest.fn().mockResolvedValue(mockUser),
      };
   });

   describe('CheckUsernameHandler', () => {
      it('should check username availability', async () => {
         const handler = new CheckUsernameHandler(authService as AuthService);
         const result = await handler.execute(new CheckUsernameCommand('john_doe'));

         expect(authService.checkUsername).toHaveBeenCalledWith('john_doe');
         expect(result).toEqual({ available: true, username: 'john_doe' });
      });
   });

   describe('HandleUserRegisteredHandler', () => {
      it('should handle user registered event', async () => {
         const handler = new HandleUserRegisteredHandler(authService as AuthService);
         const result = await handler.execute(
            new HandleUserRegisteredCommand({ accountId: 'acc-1', email: 'john@example.com' }),
         );

         expect(authService.handleUserRegistered).toHaveBeenCalledWith({
            accountId: 'acc-1',
            email: 'john@example.com',
         });
         expect(result).toEqual(mockUser);
      });
   });
});
