import type { Observable } from 'rxjs';
import type { Metadata } from '@grpc/grpc-js';

export interface INotificationItemProto {
   notificationId: string;
   userId: string;
   type: string;
   title: string;
   content: string;
   isRead: boolean;
   metadataJson?: string;
   createdAt: string;
   updatedAt: string;
}

export interface IGetUserNotificationsRequest {
   userId: string;
   limit?: number;
   offset?: number;
   unreadOnly?: boolean;
}

export interface IGetUserNotificationsResponse {
   items: INotificationItemProto[];
   total: number;
   unreadCount: number;
   limit: number;
   offset: number;
}

export interface IGetUnreadCountRequest {
   userId: string;
}

export interface IGetUnreadCountResponse {
   userId: string;
   unreadCount: number;
}

export interface IMarkAsReadRequest {
   notificationId: string;
   userId: string;
}

export interface IMarkAsReadResponse {
   notificationId: string;
   success: boolean;
}

export interface IMarkAllAsReadRequest {
   userId: string;
}

export interface IMarkAllAsReadResponse {
   userId: string;
   updatedCount: number;
   success: boolean;
}

export interface INotificationV1GrpcService {
   getUserNotifications(
      request: IGetUserNotificationsRequest,
      metadata?: Metadata,
   ): Observable<IGetUserNotificationsResponse>;
   getUnreadCount(request: IGetUnreadCountRequest, metadata?: Metadata): Observable<IGetUnreadCountResponse>;
   markAsRead(request: IMarkAsReadRequest, metadata?: Metadata): Observable<IMarkAsReadResponse>;
   markAllAsRead(request: IMarkAllAsReadRequest, metadata?: Metadata): Observable<IMarkAllAsReadResponse>;
}

export type INotificationGrpcService = INotificationV1GrpcService;
