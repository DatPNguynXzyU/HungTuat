import { Registry } from 'prom-client';
import {
   USER_METRICS_DOMAIN_OPERATIONS,
   USER_METRICS_GRAPH_OPERATIONS,
   USER_METRICS_LABELS,
   USER_METRICS_MEDIA_OPERATIONS,
   USER_METRICS_NAMES,
   USER_METRICS_NOTIFICATION_OPERATIONS,
   USER_METRICS_SEARCH_OPERATIONS,
   USER_METRICS_STATUS,
} from '@user/constants';
import { UserMetricsService } from '@user/services/infrastructure/user-metrics.service';

describe('UserMetricsService', () => {
   let service: UserMetricsService;
   let registry: Registry;

   beforeEach(() => {
      registry = new Registry();
      service = new UserMetricsService(registry);
   });

   it('should be defined', () => {
      expect(service).toBeDefined();
      expect(service.contentType).toBe(registry.contentType);
   });

   describe('Counters', () => {
      it('should record media operations', async () => {
         service.recordMediaOperation(USER_METRICS_MEDIA_OPERATIONS.UPLOAD_AVATAR, USER_METRICS_STATUS.SUCCESS);
         service.recordMediaOperation(USER_METRICS_MEDIA_OPERATIONS.GET_UPLOAD_SIGNATURE, USER_METRICS_STATUS.FAILURE);

         const metrics = await service.getMetrics();
         expect(metrics).toContain(
            `${USER_METRICS_NAMES.MEDIA_OPERATIONS}{${USER_METRICS_LABELS.OPERATION}="${USER_METRICS_MEDIA_OPERATIONS.UPLOAD_AVATAR}",${USER_METRICS_LABELS.STATUS}="${USER_METRICS_STATUS.SUCCESS}"} 1`,
         );
         expect(metrics).toContain(
            `${USER_METRICS_NAMES.MEDIA_OPERATIONS}{${USER_METRICS_LABELS.OPERATION}="${USER_METRICS_MEDIA_OPERATIONS.GET_UPLOAD_SIGNATURE}",${USER_METRICS_LABELS.STATUS}="${USER_METRICS_STATUS.FAILURE}"} 1`,
         );
      });

      it('should record search operations', async () => {
         service.recordSearchOperation(USER_METRICS_SEARCH_OPERATIONS.SEARCH_USERS, USER_METRICS_STATUS.SUCCESS);
         service.recordSearchOperation(USER_METRICS_SEARCH_OPERATIONS.INDEX_EVENT, USER_METRICS_STATUS.FAILURE);

         const metrics = await service.getMetrics();
         expect(metrics).toContain(
            `${USER_METRICS_NAMES.SEARCH_OPERATIONS}{${USER_METRICS_LABELS.OPERATION}="${USER_METRICS_SEARCH_OPERATIONS.SEARCH_USERS}",${USER_METRICS_LABELS.STATUS}="${USER_METRICS_STATUS.SUCCESS}"} 1`,
         );
         expect(metrics).toContain(
            `${USER_METRICS_NAMES.SEARCH_OPERATIONS}{${USER_METRICS_LABELS.OPERATION}="${USER_METRICS_SEARCH_OPERATIONS.INDEX_EVENT}",${USER_METRICS_LABELS.STATUS}="${USER_METRICS_STATUS.FAILURE}"} 1`,
         );
      });

      it('should record notification operations', async () => {
         service.recordNotificationOperation(
            USER_METRICS_NOTIFICATION_OPERATIONS.USER_FOLLOWED,
            USER_METRICS_STATUS.SUCCESS,
         );
         service.recordNotificationOperation(
            USER_METRICS_NOTIFICATION_OPERATIONS.FOLLOW_ACCEPTED,
            USER_METRICS_STATUS.FAILURE,
         );

         const metrics = await service.getMetrics();
         expect(metrics).toContain(
            `${USER_METRICS_NAMES.NOTIFICATION_OPERATIONS}{${USER_METRICS_LABELS.OPERATION}="${USER_METRICS_NOTIFICATION_OPERATIONS.USER_FOLLOWED}",${USER_METRICS_LABELS.STATUS}="${USER_METRICS_STATUS.SUCCESS}"} 1`,
         );
         expect(metrics).toContain(
            `${USER_METRICS_NAMES.NOTIFICATION_OPERATIONS}{${USER_METRICS_LABELS.OPERATION}="${USER_METRICS_NOTIFICATION_OPERATIONS.FOLLOW_ACCEPTED}",${USER_METRICS_LABELS.STATUS}="${USER_METRICS_STATUS.FAILURE}"} 1`,
         );
      });

      it('should record domain operations', async () => {
         service.recordDomainOperation(USER_METRICS_DOMAIN_OPERATIONS.USER_CREATED, USER_METRICS_STATUS.SUCCESS);
         service.recordDomainOperation(USER_METRICS_DOMAIN_OPERATIONS.USER_DELETED, USER_METRICS_STATUS.SUCCESS);

         const metrics = await service.getMetrics();
         expect(metrics).toContain(
            `${USER_METRICS_NAMES.DOMAIN_OPERATIONS}{${USER_METRICS_LABELS.OPERATION}="${USER_METRICS_DOMAIN_OPERATIONS.USER_CREATED}",${USER_METRICS_LABELS.STATUS}="${USER_METRICS_STATUS.SUCCESS}"} 1`,
         );
      });

      it('should record graph sync operations', async () => {
         service.recordGraphSyncOperation(USER_METRICS_GRAPH_OPERATIONS.SYNC_USER, USER_METRICS_STATUS.SUCCESS);
         service.recordGraphSyncOperation(USER_METRICS_GRAPH_OPERATIONS.SYNC_FOLLOW, USER_METRICS_STATUS.FAILURE);

         const metrics = await service.getMetrics();
         expect(metrics).toContain(
            `${USER_METRICS_NAMES.GRAPH_SYNC_OPERATIONS}{${USER_METRICS_LABELS.OPERATION}="${USER_METRICS_GRAPH_OPERATIONS.SYNC_USER}",${USER_METRICS_LABELS.STATUS}="${USER_METRICS_STATUS.SUCCESS}"} 1`,
         );
      });
   });

   describe('Histograms', () => {
      it('should observe media duration', async () => {
         service.observeMediaDuration(0.125);
         const metrics = await service.getMetrics();
         expect(metrics).toContain(`${USER_METRICS_NAMES.MEDIA_OPERATION_DURATION}_count 1`);
         expect(metrics).toContain(`${USER_METRICS_NAMES.MEDIA_OPERATION_DURATION}_sum 0.125`);
      });

      it('should observe search duration', async () => {
         service.observeSearchDuration(0.045);
         const metrics = await service.getMetrics();
         expect(metrics).toContain(`${USER_METRICS_NAMES.SEARCH_OPERATION_DURATION}_count 1`);
         expect(metrics).toContain(`${USER_METRICS_NAMES.SEARCH_OPERATION_DURATION}_sum 0.045`);
      });

      it('should observe graph sync duration', async () => {
         service.observeGraphSyncDuration(0.08);
         const metrics = await service.getMetrics();
         expect(metrics).toContain(`${USER_METRICS_NAMES.GRAPH_SYNC_DURATION}_count 1`);
      });
   });

   describe('Gauges', () => {
      it('should set total users and follows', async () => {
         service.setTotalUsers(150);
         service.setTotalFollows(420);

         const metrics = await service.getMetrics();
         expect(metrics).toContain(`${USER_METRICS_NAMES.TOTAL_USERS} 150`);
         expect(metrics).toContain(`${USER_METRICS_NAMES.TOTAL_FOLLOWS} 420`);
      });
   });

   describe('Utilities', () => {
      it('should calculate duration correctly', () => {
         const start = service.startTimer();
         expect(start).toBeGreaterThan(0);
         const duration = service.calculateDuration(start);
         expect(duration).toBeGreaterThanOrEqual(0);
      });

      it('should record gRPC metrics properly', async () => {
         service.recordGrpcCall({
            service: 'UserGrpcController',
            method: 'checkUsername',
            // TODO: Chú ý không hardcode 'OK' như này
            status: 'OK',
            durationSeconds: 0.025,
         });

         const metrics = await service.getMetrics();
         expect(metrics).toContain(
            `${USER_METRICS_NAMES.GRPC_REQUESTS}{${USER_METRICS_LABELS.SERVICE}="UserGrpcController",${USER_METRICS_LABELS.METHOD}="checkUsername",${USER_METRICS_LABELS.STATUS}="OK"} 1`,
         );
         expect(metrics).toContain(
            `${USER_METRICS_NAMES.GRPC_REQUEST_DURATION}_count{${USER_METRICS_LABELS.SERVICE}="UserGrpcController",${USER_METRICS_LABELS.METHOD}="checkUsername",${USER_METRICS_LABELS.STATUS}="OK"} 1`,
         );
      });

      it('should reset metrics without throwing', () => {
         expect(() => service.reset()).not.toThrow();
      });
   });
});
