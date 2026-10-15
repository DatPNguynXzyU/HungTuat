import {
   ChangePasswordCommand,
   ChangePasswordHandler,
   VerifyChangePasswordOtpCommand,
   VerifyChangePasswordOtpHandler,
} from '@auth/commands/password';
import type { PasswordManagementService } from '@auth/services/domain';

describe('Password Command Handlers', () => {
   let passwordManagementService: jest.Mocked<Partial<PasswordManagementService>>;

   beforeEach(() => {
      passwordManagementService = {
         changePassword: jest.fn().mockResolvedValue({
            success: true,
            message: 'AUTH.PASSWORD_CHANGE_SUCCESS',
            requiresOtp: false,
         }),
         verifyChangePasswordOtp: jest.fn().mockResolvedValue({
            success: true,
            message: 'AUTH.PASSWORD_CHANGE_SUCCESS',
         }),
      };
   });

   it('should execute ChangePasswordCommand', async () => {
      const handler = new ChangePasswordHandler(passwordManagementService as PasswordManagementService);
      const dto = {
         currentPassword: 'OldPassword123!',
         newPassword: 'NewPassword123!',
         confirmPassword: 'NewPassword123!',
      };
      const result = await handler.execute(new ChangePasswordCommand(dto, 'acc-1'));

      expect(passwordManagementService.changePassword).toHaveBeenCalledWith('acc-1', dto, undefined);
      expect(result.success).toBe(true);
   });

   it('should execute VerifyChangePasswordOtpCommand', async () => {
      const handler = new VerifyChangePasswordOtpHandler(passwordManagementService as PasswordManagementService);
      const dto = { otp: '654321' };
      const result = await handler.execute(new VerifyChangePasswordOtpCommand(dto, 'acc-1'));

      expect(passwordManagementService.verifyChangePasswordOtp).toHaveBeenCalledWith('acc-1', dto, undefined);
      expect(result.success).toBe(true);
   });
});
