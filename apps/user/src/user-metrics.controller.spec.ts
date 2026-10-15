import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { UserMetricsController } from '@user/user-metrics.controller';
import { USER_METRICS_SERVICE, type IUserMetricsService } from '@user/services/infrastructure';

describe('UserMetricsController', () => {
   let controller: UserMetricsController;
   let mockMetricsService: jest.Mocked<IUserMetricsService>;
   let getMetricsMock: jest.Mock;

   beforeEach(async () => {
      getMetricsMock = jest.fn().mockResolvedValue('# HELP test user metric\n');
      mockMetricsService = {
         contentType: 'text/plain; version=0.0.4; charset=utf-8',
         getMetrics: getMetricsMock,
         recordMediaOperation: jest.fn(),
         recordSearchOperation: jest.fn(),
         recordNotificationOperation: jest.fn(),
         recordDomainOperation: jest.fn(),
         recordGraphSyncOperation: jest.fn(),
         observeMediaDuration: jest.fn(),
         observeSearchDuration: jest.fn(),
         observeGraphSyncDuration: jest.fn(),
         setTotalUsers: jest.fn(),
         setTotalFollows: jest.fn(),
         startTimer: jest.fn().mockReturnValue(12345),
         calculateDuration: jest.fn().mockReturnValue(0.5),
         reset: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
         controllers: [UserMetricsController],
         providers: [
            {
               provide: USER_METRICS_SERVICE,
               useValue: mockMetricsService,
            },
         ],
      }).compile();

      controller = module.get<UserMetricsController>(UserMetricsController);
   });

   it('should be defined', () => {
      expect(controller).toBeDefined();
   });

   it('should return metrics with correct content type', async () => {
      const setHeaderMock = jest.fn();
      const sendMock = jest.fn();
      const res = {
         setHeader: setHeaderMock,
         send: sendMock,
      } as unknown as Response;

      await controller.getMetrics(res);

      expect(setHeaderMock).toHaveBeenCalledWith('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      expect(getMetricsMock).toHaveBeenCalled();
      expect(sendMock).toHaveBeenCalledWith('# HELP test user metric\n');
   });

   it('should handle error and return 500 when metrics collection fails', async () => {
      getMetricsMock.mockRejectedValueOnce(new Error('Collection failed'));
      const setHeaderMock = jest.fn();
      const sendMock = jest.fn();
      const statusMock = jest.fn().mockReturnValue({ send: sendMock });
      const res = {
         setHeader: setHeaderMock,
         status: statusMock,
         send: sendMock,
      } as unknown as Response;

      await controller.getMetrics(res);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(sendMock).toHaveBeenCalledWith('# Error collecting metrics\n');
   });
});
