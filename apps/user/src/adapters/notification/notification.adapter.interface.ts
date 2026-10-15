import { FollowStatus } from '@user/entities';

export const NOTIFICATION_ADAPTER = Symbol('NOTIFICATION_ADAPTER');

export interface UserFollowedNotificationData {
   followId: string;
   followerId: string;
   recipientId: string;
   status: FollowStatus;
   createdAt: Date;
}

export interface FollowAcceptedNotificationData {
   followId: string;
   recipientId: string;
   acceptedBy: string;
   acceptedAt: Date;
}

/**
 * Port contract for Notification microservice operations.
 * Follows the Ports & Adapters (Hexagonal Architecture) pattern,
 * decoupling User domain and event handlers from RabbitMQ ClientProxy transport.
 */
export interface INotificationAdapter {
   sendUserFollowedNotification(data: UserFollowedNotificationData): Promise<void>;
   sendFollowAcceptedNotification(data: FollowAcceptedNotificationData): Promise<void>;
}

export type IUserNotificationAdapter = INotificationAdapter;
