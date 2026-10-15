import type { SendEmailDto } from '@contracts/notification';

export const NOTIFICATION_ADAPTER = Symbol('NOTIFICATION_ADAPTER');

export interface SecurityAlertNotificationData {
   email: string;
   ipAddress?: string;
   lockedUntil: Date;
   failedAttempts: number;
}

export interface PasswordChangedNotificationData {
   email: string;
   changedAt: Date;
   ipAddress?: string;
   deviceType?: string;
}

export interface WelcomeEmailNotificationData {
   email: string;
   registeredAt: Date;
}

/**
 * Port contract for notification operations.
 * Follows the Ports & Adapters (Hexagonal Architecture) and GoF Adapter pattern,
 * decoupling domain services and event handlers from the underlying message broker (RabbitMQ ClientProxy).
 */
export interface INotificationAdapter {
   sendRegistrationOtp(email: string, otpCode: string, expiresInMinutes: number): Promise<void>;
   sendChangePasswordOtp(email: string, otpCode: string, expiresInMinutes: number): Promise<void>;
   sendSecurityAlert(data: SecurityAlertNotificationData): Promise<void>;
   sendPasswordChangedConfirmation(data: PasswordChangedNotificationData): Promise<void>;
   sendWelcomeEmail(data: WelcomeEmailNotificationData): Promise<void>;
   sendEmail(dto: SendEmailDto): Promise<void>;
}
