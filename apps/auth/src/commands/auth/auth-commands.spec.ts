import { DEFAULT_ROLES } from '@common';
import {
   GetEmailCommand,
   GetEmailHandler,
   GetJwksHandler,
   GetRolePermissionsCommand,
   GetRolePermissionsHandler,
   LoginCommand,
   LoginHandler,
   LogoutAllCommand,
   LogoutAllHandler,
   RefreshTokenCommand,
   RefreshTokenHandler,
   RevokeAllAccountTokensCommand,
   RevokeAllAccountTokensHandler,
   RevokeTokenCommand,
   RevokeTokenHandler,
   ValidateTokenCommand,
   ValidateTokenHandler,
} from '@auth/commands/auth';
import type { AuthCoreService } from '@auth/services/domain';

describe('Auth Command Handlers', () => {
   let authCoreService: jest.Mocked<Partial<AuthCoreService>>;

   beforeEach(() => {
      authCoreService = {
         getJwks: jest.fn().mockReturnValue({ keys: [] }),
         login: jest.fn().mockResolvedValue({ accessToken: 'token-1' }),
         refreshToken: jest.fn().mockResolvedValue({ accessToken: 'token-2' }),
         revokeToken: jest.fn().mockResolvedValue(undefined),
         revokeAllAccountTokens: jest.fn().mockResolvedValue(undefined),
         logoutAll: jest.fn().mockResolvedValue(undefined),
         validateToken: jest.fn().mockResolvedValue({ valid: true, accountId: 'acc-1' }),
         getRolePermissions: jest.fn().mockResolvedValue(['USERS:READ']),
         getEmail: jest.fn().mockResolvedValue({ email: 'user@example.com' }),
      };
   });

   it('should execute GetJwksCommand', () => {
      const handler = new GetJwksHandler(authCoreService as AuthCoreService);
      const result = handler.execute();

      expect(authCoreService.getJwks).toHaveBeenCalled();
      expect(result).toEqual({ keys: [] });
   });

   it('should execute LoginCommand', async () => {
      const handler = new LoginHandler(authCoreService as AuthCoreService);
      const result = await handler.execute(new LoginCommand({ email: 'user@example.com', password: 'Password123!' }));

      expect(authCoreService.login).toHaveBeenCalledWith(
         { email: 'user@example.com', password: 'Password123!' },
         undefined,
      );
      expect(result.accessToken).toBe('token-1');
   });

   it('should execute RefreshTokenCommand', async () => {
      const handler = new RefreshTokenHandler(authCoreService as AuthCoreService);
      const result = await handler.execute(new RefreshTokenCommand('rtk-valid'));

      expect(authCoreService.refreshToken).toHaveBeenCalledWith('rtk-valid', undefined);
      expect(result.accessToken).toBe('token-2');
   });

   it('should execute RevokeTokenCommand', async () => {
      const handler = new RevokeTokenHandler(authCoreService as AuthCoreService);
      const result = await handler.execute(new RevokeTokenCommand('tok-to-revoke'));

      expect(authCoreService.revokeToken).toHaveBeenCalledWith('tok-to-revoke', undefined);
      expect(result).toEqual({ success: true });
   });

   it('should execute RevokeAllAccountTokensCommand', async () => {
      const handler = new RevokeAllAccountTokensHandler(authCoreService as AuthCoreService);
      const result = await handler.execute(new RevokeAllAccountTokensCommand('acc-1'));

      expect(authCoreService.revokeAllAccountTokens).toHaveBeenCalledWith('acc-1', undefined);
      expect(result.success).toBe(true);
   });

   it('should execute LogoutAllCommand', async () => {
      const handler = new LogoutAllHandler(authCoreService as AuthCoreService);
      const result = await handler.execute(new LogoutAllCommand('acc-1'));

      expect(authCoreService.logoutAll).toHaveBeenCalledWith('acc-1', undefined);
      expect(result.success).toBe(true);
   });

   it('should execute ValidateTokenCommand', async () => {
      const handler = new ValidateTokenHandler(authCoreService as AuthCoreService);
      const result = await handler.execute(new ValidateTokenCommand('jwt-token'));

      expect(authCoreService.validateToken).toHaveBeenCalledWith('jwt-token');
      expect(result.valid).toBe(true);
   });

   it('should execute GetRolePermissionsCommand', async () => {
      const handler = new GetRolePermissionsHandler(authCoreService as AuthCoreService);
      const result = await handler.execute(new GetRolePermissionsCommand(DEFAULT_ROLES.USER));

      expect(authCoreService.getRolePermissions).toHaveBeenCalledWith(DEFAULT_ROLES.USER);
      expect(result).toEqual(['USERS:READ']);
   });

   it('should execute GetEmailCommand', async () => {
      const handler = new GetEmailHandler(authCoreService as AuthCoreService);
      const result = await handler.execute(new GetEmailCommand('acc-123'));

      expect(authCoreService.getEmail).toHaveBeenCalledWith('acc-123');
      expect(result.email).toBe('user@example.com');
   });
});
