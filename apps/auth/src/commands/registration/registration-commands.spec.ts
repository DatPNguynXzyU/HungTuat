import {
   CheckEmailCommand,
   CheckEmailHandler,
   RegisterCommand,
   RegisterHandler,
   RegisterSupplierCommand,
   RegisterSupplierHandler,
   SendRegisterOtpCommand,
   SendRegisterOtpHandler,
   VerifyRegisterOtpCommand,
   VerifyRegisterOtpHandler,
} from '@auth/commands/registration';
import type { AuthRegistrationService } from '@auth/services/domain';

describe('Registration Command Handlers', () => {
   let authRegistrationService: jest.Mocked<Partial<AuthRegistrationService>>;

   beforeEach(() => {
      authRegistrationService = {
         checkEmail: jest.fn().mockResolvedValue({ available: true, email: 'test@example.com' }),
         sendRegisterOtp: jest.fn().mockResolvedValue({ success: true, cooldownSeconds: 60 }),
         verifyRegisterOtp: jest.fn().mockResolvedValue({ success: true, verificationToken: 'vtoken-123' }),
         register: jest.fn().mockResolvedValue({
            accessToken: 'atk-123',
            refreshToken: 'rtk-123',
            user: { id: 'acc-1', email: 'test@example.com' },
         }),
      };
   });

   it('should execute CheckEmailCommand', async () => {
      const handler = new CheckEmailHandler(authRegistrationService as AuthRegistrationService);
      const result = await handler.execute(new CheckEmailCommand('test@example.com'));

      expect(authRegistrationService.checkEmail).toHaveBeenCalledWith('test@example.com');
      expect(result).toEqual({ available: true, email: 'test@example.com' });
   });

   it('should execute SendRegisterOtpCommand', async () => {
      const handler = new SendRegisterOtpHandler(authRegistrationService as AuthRegistrationService);
      const result = await handler.execute(new SendRegisterOtpCommand({ email: 'test@example.com' }));

      expect(authRegistrationService.sendRegisterOtp).toHaveBeenCalledWith({ email: 'test@example.com' }, undefined);
      expect(result.success).toBe(true);
   });

   it('should execute VerifyRegisterOtpCommand', async () => {
      const handler = new VerifyRegisterOtpHandler(authRegistrationService as AuthRegistrationService);
      const result = await handler.execute(new VerifyRegisterOtpCommand({ email: 'test@example.com', otp: '123456' }));

      expect(authRegistrationService.verifyRegisterOtp).toHaveBeenCalledWith(
         { email: 'test@example.com', otp: '123456' },
         undefined,
      );
      expect(result.success).toBe(true);
   });

   it('should execute RegisterCommand', async () => {
      const handler = new RegisterHandler(authRegistrationService as AuthRegistrationService);
      const result = await handler.execute(
         new RegisterCommand({
            email: 'test@example.com',
            password: 'Password123!',
            confirmPassword: 'Password123!',
         }),
      );

      expect(authRegistrationService.register).toHaveBeenCalledWith(
         {
            email: 'test@example.com',
            password: 'Password123!',
            confirmPassword: 'Password123!',
         },
         undefined,
      );
      expect(result.accessToken).toBe('atk-123');
   });

   it('should execute RegisterSupplierCommand', async () => {
      authRegistrationService.registerSupplier = jest.fn().mockResolvedValue({
         accessToken: 'atk-supplier-123',
         refreshToken: 'rtk-supplier-123',
         user: { id: 'acc-sup-1', email: 'supplier@example.com' },
      });
      const handler = new RegisterSupplierHandler(authRegistrationService as AuthRegistrationService);
      const result = await handler.execute(
         new RegisterSupplierCommand({
            email: 'supplier@example.com',
            password: 'Password123!',
            confirmPassword: 'Password123!',
         }),
      );

      expect(authRegistrationService.registerSupplier).toHaveBeenCalledWith(
         {
            email: 'supplier@example.com',
            password: 'Password123!',
            confirmPassword: 'Password123!',
         },
         undefined,
      );
      expect(result.accessToken).toBe('atk-supplier-123');
   });
});
