import { Test, TestingModule } from '@nestjs/testing';
import { ClientProxy } from '@nestjs/microservices';
import { of, throwError } from 'rxjs';
import { SERVICES } from '@common';
import { NOTIFICATION_PATTERNS } from '@contracts/notification';
import { FollowStatus } from '@user/core/database/entities';
import { RabbitMqNotificationAdapter } from '@user/adapters/notification/rabbitmq-notification.adapter';
import type {
   FollowAcceptedNotificationData,
   UserFollowedNotificationData,
} from '@user/adapters/notification/notification.adapter.interface';

describe('RabbitMqNotificationAdapter', () => {
   let adapter: RabbitMqNotificationAdapter;
   let notificationClient: jest.Mocked<Partial<ClientProxy>>;

   beforeEach(async () => {
      notificationClient = {
         emit: jest.fn().mockReturnValue(of(true)),
      };

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            RabbitMqNotificationAdapter,
            {
               provide: SERVICES.NOTIFICATION_SERVICE,
               useValue: notificationClient,
            },
         ],
      }).compile();

      adapter = module.get<RabbitMqNotificationAdapter>(RabbitMqNotificationAdapter);
   });

   it('should be defined', () => {
      expect(adapter).toBeDefined();
   });

   it('should emit USER_FOLLOWED pattern with notification data', async () => {
      const data: UserFollowedNotificationData = {
         followId: 'f1',
         followerId: 'u1',
         recipientId: 'u2',
         status: FollowStatus.ACCEPTED,
         createdAt: new Date(),
      };

      await adapter.sendUserFollowedNotification(data);

      expect(notificationClient.emit).toHaveBeenCalledWith(NOTIFICATION_PATTERNS.USER_FOLLOWED, data);
   });

   it('should emit FOLLOW_ACCEPTED pattern with notification data', async () => {
      const data: FollowAcceptedNotificationData = {
         followId: 'f1',
         recipientId: 'u1',
         acceptedBy: 'u2',
         acceptedAt: new Date(),
      };

      await adapter.sendFollowAcceptedNotification(data);

      expect(notificationClient.emit).toHaveBeenCalledWith(NOTIFICATION_PATTERNS.FOLLOW_ACCEPTED, data);
   });

   it('should catch error when emit throws without bubbling up', async () => {
      (notificationClient.emit as jest.Mock).mockReturnValueOnce(throwError(() => new Error('Transport error')));

      const data: UserFollowedNotificationData = {
         followId: 'f1',
         followerId: 'u1',
         recipientId: 'u2',
         status: FollowStatus.ACCEPTED,
         createdAt: new Date(),
      };

      await expect(adapter.sendUserFollowedNotification(data)).resolves.toBeUndefined();
   });
});
