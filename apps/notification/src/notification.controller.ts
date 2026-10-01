import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import {
   NOTIFICATION_EVENTS,
   NOTIFICATION_PATTERNS,
   RmqService,
   SendEmailDto,
   SendOtpEmailDto,
   SendResetPasswordEmailDto,
   SendVerificationEmailDto,
   SendWelcomeEmailDto,
   SendChangePasswordOtpEmailDto,
} from '@common';
import { NotificationService } from '@notification/notification.service';

@Controller()
export class NotificationController {
   private readonly logger = new Logger(NotificationController.name);

   constructor(
      private readonly notificationService: NotificationService,
      private readonly rmqService: RmqService,
   ) {}

   @EventPattern(NOTIFICATION_PATTERNS.SEND_EMAIL)
   async sendEmail(@Payload() data: SendEmailDto, @Ctx() context: RmqContext) {
      this.logger.log(`Received sendEmail message for: ${Array.isArray(data.to) ? data.to.join(', ') : data.to}`);
      try {
         const result = await this.notificationService.sendEmail(data);
         this.rmqService.ack(context);
         return result;
      } catch (error) {
         this.rmqService.ack(context);
         throw error;
      }
   }

   @EventPattern(NOTIFICATION_PATTERNS.SEND_WELCOME_EMAIL)
   async sendWelcomeEmail(@Payload() data: SendWelcomeEmailDto, @Ctx() context: RmqContext) {
      this.logger.log(`Received sendWelcomeEmail message for: ${data.to}`);
      try {
         const result = await this.notificationService.sendWelcomeEmail(data);
         this.rmqService.ack(context);
         return result;
      } catch (error) {
         this.rmqService.ack(context);
         throw error;
      }
   }

   @EventPattern(NOTIFICATION_PATTERNS.SEND_VERIFICATION_EMAIL)
   async sendVerificationEmail(@Payload() data: SendVerificationEmailDto, @Ctx() context: RmqContext) {
      this.logger.log(`Received sendVerificationEmail message for: ${data.to}`);
      try {
         const result = await this.notificationService.sendVerificationEmail(data);
         this.rmqService.ack(context);
         return result;
      } catch (error) {
         this.rmqService.ack(context);
         throw error;
      }
   }

   @EventPattern(NOTIFICATION_PATTERNS.SEND_RESET_PASSWORD_EMAIL)
   async sendResetPasswordEmail(@Payload() data: SendResetPasswordEmailDto, @Ctx() context: RmqContext) {
      this.logger.log(`Received sendResetPasswordEmail message for: ${data.to}`);
      try {
         const result = await this.notificationService.sendResetPasswordEmail(data);
         this.rmqService.ack(context);
         return result;
      } catch (error) {
         this.rmqService.ack(context);
         throw error;
      }
   }

   @EventPattern(NOTIFICATION_PATTERNS.SEND_OTP_EMAIL)
   async sendOtpEmail(@Payload() data: SendOtpEmailDto, @Ctx() context: RmqContext) {
      this.logger.log(`Received sendOtpEmail message for: ${data.to}`);
      try {
         const result = await this.notificationService.sendOtpEmail(data);
         this.rmqService.ack(context);
         return result;
      } catch (error) {
         this.rmqService.ack(context);
         throw error;
      }
   }

   @EventPattern(NOTIFICATION_PATTERNS.SEND_CHANGE_PASSWORD_OTP_EMAIL)
   async sendChangePasswordOtpEmail(@Payload() data: SendChangePasswordOtpEmailDto, @Ctx() context: RmqContext) {
      this.logger.log(`Received sendChangePasswordOtpEmail message for: ${data.to}`);
      try {
         const result = await this.notificationService.sendChangePasswordOtpEmail(data);
         this.rmqService.ack(context);
         return result;
      } catch (error) {
         this.rmqService.ack(context);
         throw error;
      }
   }

   @EventPattern(NOTIFICATION_EVENTS.USER_REGISTERED)
   async handleUserRegistered(@Payload() data: { email: string; fullName: string }, @Ctx() context: RmqContext) {
      this.logger.log(`Received USER_REGISTERED event for email: ${data?.email} (${data?.fullName})`);
      try {
         const result = await this.notificationService.sendWelcomeEmail({
            to: data.email,
            fullName: data.fullName,
         });
         this.rmqService.ack(context);
         this.logger.log(`Successfully dispatched welcome email for user: ${data?.email}`);
         return result;
      } catch (error) {
         this.rmqService.ack(context);
         const message = error instanceof Error ? error.message : String(error);
         this.logger.error(`Failed to handle USER_REGISTERED for ${data?.email}: ${message}`);
         throw error;
      }
   }
}
