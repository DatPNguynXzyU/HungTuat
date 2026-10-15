import {
   GetSessionsCommand,
   GetSessionsHandler,
   RevokeOtherSessionsCommand,
   RevokeOtherSessionsHandler,
   RevokeSessionCommand,
   RevokeSessionHandler,
} from '@auth/commands/session';
import type { SessionManagementService } from '@auth/services/domain';

describe('Session Command Handlers', () => {
   let sessionManagementService: jest.Mocked<Partial<SessionManagementService>>;

   beforeEach(() => {
      sessionManagementService = {
         getSessions: jest.fn().mockResolvedValue([]),
         revokeSession: jest.fn().mockResolvedValue(undefined),
         revokeOtherSessions: jest.fn().mockResolvedValue({ revokedCount: 3 }),
      };
   });

   it('should execute GetSessionsCommand', async () => {
      const handler = new GetSessionsHandler(sessionManagementService as SessionManagementService);
      const result = await handler.execute(new GetSessionsCommand('acc-1', undefined, 'current-jti'));

      expect(sessionManagementService.getSessions).toHaveBeenCalledWith('acc-1', 'current-jti');
      expect(result).toEqual([]);
   });

   it('should execute RevokeSessionCommand', async () => {
      const handler = new RevokeSessionHandler(sessionManagementService as SessionManagementService);
      const result = await handler.execute(new RevokeSessionCommand('sess-1', 'acc-1'));

      expect(sessionManagementService.revokeSession).toHaveBeenCalledWith('acc-1', 'sess-1', undefined);
      expect(result).toEqual({ success: true });
   });

   it('should execute RevokeOtherSessionsCommand', async () => {
      const handler = new RevokeOtherSessionsHandler(sessionManagementService as SessionManagementService);
      const result = await handler.execute(new RevokeOtherSessionsCommand('current-jti', 'acc-1'));

      expect(sessionManagementService.revokeOtherSessions).toHaveBeenCalledWith('acc-1', 'current-jti', undefined);
      expect(result).toEqual({ revokedCount: 3 });
   });
});
