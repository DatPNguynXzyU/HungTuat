import * as fs from 'fs';
import {
   buildGrpcPackageName,
   DEFAULT_PROTO_VERSION,
   getNotificationProtoDir,
   getNotificationProtoLoaderOptions,
   getNotificationProtoPath,
   NOTIFICATION_GRPC_DOMAIN,
   NOTIFICATION_V1_FULL_SERVICE_NAME,
   NOTIFICATION_V1_GRPC_CLIENT,
   NOTIFICATION_V1_GRPC_METHODS,
   NOTIFICATION_V1_GRPC_PACKAGE_NAME,
   NOTIFICATION_V1_GRPC_SERVICE_NAME,
   PROTO_VERSIONS,
} from './grpc.constant';

describe('Notification gRPC Constants and Proto Resolution', () => {
   it('should define domain, version, and dynamic package name correctly', () => {
      expect(NOTIFICATION_GRPC_DOMAIN).toBe('notification');
      expect(PROTO_VERSIONS.V1).toBe('v1');
      expect(DEFAULT_PROTO_VERSION).toBe('v1');
      expect(buildGrpcPackageName(NOTIFICATION_GRPC_DOMAIN, PROTO_VERSIONS.V1)).toBe('notification.v1');
      expect(NOTIFICATION_V1_GRPC_PACKAGE_NAME).toBe('notification.v1');
      expect(NOTIFICATION_V1_GRPC_SERVICE_NAME).toBe('NotificationService');
      expect(NOTIFICATION_V1_FULL_SERVICE_NAME).toBe('notification.v1.NotificationService');
      expect(NOTIFICATION_V1_GRPC_CLIENT).toBe('NOTIFICATION_V1_GRPC_CLIENT');
   });

   it('should define all RPC methods in NOTIFICATION_V1_GRPC_METHODS', () => {
      expect(NOTIFICATION_V1_GRPC_METHODS.GET_USER_NOTIFICATIONS).toBe('GetUserNotifications');
      expect(NOTIFICATION_V1_GRPC_METHODS.GET_UNREAD_COUNT).toBe('GetUnreadCount');
      expect(NOTIFICATION_V1_GRPC_METHODS.MARK_AS_READ).toBe('MarkAsRead');
      expect(NOTIFICATION_V1_GRPC_METHODS.MARK_ALL_AS_READ).toBe('MarkAllAsRead');
   });

   it('should resolve proto path and ensure file exists on disk', () => {
      const protoPath = getNotificationProtoPath();
      expect(fs.existsSync(protoPath)).toBe(true);
      expect(protoPath).toMatch(/notification\.proto$/);
   });

   it('should configure proto loader options with correct includeDirs', () => {
      const options = getNotificationProtoLoaderOptions();
      expect(options.keepCase).toBe(true);
      expect(options.defaults).toBe(true);
      expect(options.oneofs).toBe(true);
      expect(options.includeDirs).toBeDefined();
      expect(options.includeDirs?.[0]).toBe(getNotificationProtoDir());
      expect(fs.existsSync(options.includeDirs![0])).toBe(true);
   });
});
