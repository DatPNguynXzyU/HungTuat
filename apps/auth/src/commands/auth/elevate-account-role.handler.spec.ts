import { ElevateAccountRoleCommand } from '@auth/commands/auth/elevate-account-role.command';
import { ElevateAccountRoleHandler } from '@auth/commands/auth/elevate-account-role.handler';
import type { AuthRbacService } from '@auth/services/domain/auth-rbac.service';
import { SYSTEM_ROLES } from '@common';

describe('ElevateAccountRoleHandler', () => {
   let handler: ElevateAccountRoleHandler;
   let mockAuthRbacService: jest.Mocked<Partial<AuthRbacService>>;

   beforeEach(() => {
      mockAuthRbacService = {
         assignRoleToAccount: jest.fn().mockResolvedValue(undefined),
      };
      handler = new ElevateAccountRoleHandler(mockAuthRbacService as AuthRbacService);
   });

   it('should execute ElevateAccountRoleCommand and call assignRoleToAccount', async () => {
      const command = new ElevateAccountRoleCommand('acc-123', SYSTEM_ROLES.SUPER_ADMIN);
      await handler.execute(command);

      expect(mockAuthRbacService.assignRoleToAccount).toHaveBeenCalledWith('acc-123', SYSTEM_ROLES.SUPER_ADMIN);
   });
});
