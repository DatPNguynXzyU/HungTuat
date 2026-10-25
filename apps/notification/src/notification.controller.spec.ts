import { Test, TestingModule } from '@nestjs/testing';
import { RmqContext } from '@nestjs/microservices';
import { QUEUES, RmqService } from '@common';
import { NotificationController } from '@notification/notification.controller';
import { NotificationService } from '@notification/notification.service';

describe('NotificationController', () => {
   let controller: NotificationController;
   let mockSendEmail: jest.Mock;
   let mockSendWelcomeEmail: jest.Mock;
   let mockSendSupplierWelcomeEmail: jest.Mock;
   let mockSendVerificationEmail: jest.Mock;
   let mockSendResetPasswordEmail: jest.Mock;
   let mockSendOtpEmail: jest.Mock;
   let mockAck: jest.Mock;
   let mockHandleError: jest.Mock;
   let mockGetEventId: jest.Mock;

   const mockContext = {
      getChannelRef: jest.fn(),
      getMessage: jest.fn(),
   } as unknown as RmqContext;

   beforeEach(async () => {
      mockSendEmail = jest.fn().mockResolvedValue({ id: 'msg_1', to: 'test@example.com', subject: 'Custom' });
      mockSendWelcomeEmail = jest.fn().mockResolvedValue({ id: 'msg_2', to: 'test@example.com', subject: 'Welcome' });
      mockSendSupplierWelcomeEmail = jest
         .fn()
         .mockResolvedValue({ id: 'msg_sup', to: 'supplier@example.com', subject: 'Supplier Welcome' });
      mockSendVerificationEmail = jest
         .fn()
         .mockResolvedValue({ id: 'msg_3', to: 'test@example.com', subject: 'Verify' });
      mockSendResetPasswordEmail = jest
         .fn()
         .mockResolvedValue({ id: 'msg_4', to: 'test@example.com', subject: 'Reset' });
      mockSendOtpEmail = jest.fn().mockResolvedValue({ id: 'msg_5', to: 'test@example.com', subject: 'OTP' });
      mockAck = jest.fn();
      mockHandleError = jest.fn().mockResolvedValue({ action: 'RETRY', retries: 1 });
      mockGetEventId = jest.fn().mockReturnValue(undefined);

      const mockNotificationService = {
         sendEmail: mockSendEmail,
         sendWelcomeEmail: mockSendWelcomeEmail,
         sendSupplierWelcomeEmail: mockSendSupplierWelcomeEmail,
         sendVerificationEmail: mockSendVerificationEmail,
         sendResetPasswordEmail: mockSendResetPasswordEmail,
         sendOtpEmail: mockSendOtpEmail,
      };

      const mockRmqService = {
         ack: mockAck,
         handleError: mockHandleError,
         getEventId: mockGetEventId,
         getOptions: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
         controllers: [NotificationController],
         providers: [
            {
               provide: NotificationService,
               useValue: mockNotificationService,
            },
            {
               provide: RmqService,
               useValue: mockRmqService,
            },
         ],
      }).compile();

      controller = module.get<NotificationController>(NotificationController);
   });

   it('should handle sendEmail message pattern and ack', async () => {
      const payload = { to: 'test@example.com', subject: 'Test', html: '<p>Hi</p>' };
      const res = await controller.sendEmail(payload, mockContext);

      expect(res).toEqual({ id: 'msg_1', to: 'test@example.com', subject: 'Custom' });
      expect(mockSendEmail).toHaveBeenCalledWith(payload, undefined);
      expect(mockAck).toHaveBeenCalledWith(mockContext);
      expect(mockHandleError).not.toHaveBeenCalled();
   });

   it('should extract eventId from payload or headers and forward to service', async () => {
      const payload = { to: 'test@example.com', subject: 'Test', eventId: 'evt-explicit' };
      await controller.sendEmail(payload, mockContext);

      expect(mockSendEmail).toHaveBeenCalledWith(payload, 'evt-explicit');
   });

   it('should handle sendWelcomeEmail message pattern and ack', async () => {
      const payload = { to: 'test@example.com', fullName: 'John Doe' };
      const res = await controller.sendWelcomeEmail(payload, mockContext);

      expect(res).toEqual({ id: 'msg_2', to: 'test@example.com', subject: 'Welcome' });
      expect(mockSendWelcomeEmail).toHaveBeenCalledWith(payload, undefined);
      expect(mockAck).toHaveBeenCalledWith(mockContext);
   });

   it('should handle sendVerificationEmail and ack', async () => {
      const payload = { to: 'test@example.com', fullName: 'John Doe', verificationUrl: 'http://test' };
      const res = await controller.sendVerificationEmail(payload, mockContext);

      expect(res).toEqual({ id: 'msg_3', to: 'test@example.com', subject: 'Verify' });
      expect(mockSendVerificationEmail).toHaveBeenCalledWith(payload, undefined);
      expect(mockAck).toHaveBeenCalledWith(mockContext);
   });

   it('should handle sendResetPasswordEmail and ack', async () => {
      const payload = { to: 'test@example.com', fullName: 'John Doe', resetUrl: 'http://test' };
      const res = await controller.sendResetPasswordEmail(payload, mockContext);

      expect(res).toEqual({ id: 'msg_4', to: 'test@example.com', subject: 'Reset' });
      expect(mockSendResetPasswordEmail).toHaveBeenCalledWith(payload, undefined);
      expect(mockAck).toHaveBeenCalledWith(mockContext);
   });

   it('should handle sendOtpEmail and ack', async () => {
      const payload = { to: 'test@example.com', otpCode: '123456' };
      const res = await controller.sendOtpEmail(payload, mockContext);

      expect(res).toEqual({ id: 'msg_5', to: 'test@example.com', subject: 'OTP' });
      expect(mockSendOtpEmail).toHaveBeenCalledWith(payload, undefined);
      expect(mockAck).toHaveBeenCalledWith(mockContext);
   });

   it('should handle handleUserRegistered event pattern and ack', async () => {
      const payload = { email: 'test@example.com', fullName: 'John Doe', eventId: 'evt-reg-1' };
      const res = await controller.handleUserRegistered(payload, mockContext);

      expect(res).toEqual({ id: 'msg_2', to: 'test@example.com', subject: 'Welcome' });
      expect(mockSendWelcomeEmail).toHaveBeenCalledWith(
         {
            to: 'test@example.com',
            fullName: 'John Doe',
            eventId: 'evt-reg-1',
         },
         'evt-reg-1',
      );
      expect(mockAck).toHaveBeenCalledWith(mockContext);
   });

   it('should handle sendSupplierWelcomeEmail and ack', async () => {
      const payload = { to: 'supplier@example.com', fullName: 'Supplier A', supplierName: 'Biz LLC' };
      const res = await controller.sendSupplierWelcomeEmail(payload, mockContext);

      expect(res).toEqual({ id: 'msg_sup', to: 'supplier@example.com', subject: 'Supplier Welcome' });
      expect(mockSendSupplierWelcomeEmail).toHaveBeenCalledWith(payload, undefined);
      expect(mockAck).toHaveBeenCalledWith(mockContext);
   });

   it('should handle handleSupplierRegistered event pattern and ack', async () => {
      const payload = {
         email: 'supplier@example.com',
         accountId: 'acc-1',
         supplierName: 'Organic Foods',
         eventId: 'evt-sup-reg',
      };
      const res = await controller.handleSupplierRegistered(payload, mockContext);

      expect(res).toEqual({ id: 'msg_sup', to: 'supplier@example.com', subject: 'Supplier Welcome' });
      expect(mockSendSupplierWelcomeEmail).toHaveBeenCalledWith(
         {
            to: 'supplier@example.com',
            fullName: 'Organic Foods',
            supplierName: 'Organic Foods',
            eventId: 'evt-sup-reg',
         },
         'evt-sup-reg',
      );
      expect(mockAck).toHaveBeenCalledWith(mockContext);
   });

   it('should NOT ack and should call handleError when service fails', async () => {
      mockSendEmail.mockRejectedValue(new Error('Send error'));

      await expect(controller.sendEmail({ to: 'fail@example.com', subject: 'Fail' }, mockContext)).rejects.toThrow(
         'Send error',
      );

      expect(mockAck).not.toHaveBeenCalled();
      expect(mockHandleError).toHaveBeenCalledWith(
         expect.any(Error),
         mockContext,
         expect.objectContaining({ queue: QUEUES.NOTIFICATION }),
      );
   });
});
