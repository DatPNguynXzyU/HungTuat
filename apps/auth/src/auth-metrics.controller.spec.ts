import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { AuthMetricsController } from './auth-metrics.controller';
import { AUTH_METRICS_SERVICE, IAuthMetricsService } from '@auth/services/infrastructure';

describe('AuthMetricsController', () => {
   let controller: AuthMetricsController;
   let mockMetricsService: jest.Mocked<IAuthMetricsService>;
   let getMetricsMock: jest.Mock;

   beforeEach(async () => {
      getMetricsMock = jest.fn().mockResolvedValue('# HELP test metric\n');
      mockMetricsService = {
         contentType: 'text/plain; version=0.0.4; charset=utf-8',
         getMetrics: getMetricsMock,
         recordLoginAttempt: jest.fn(),
         recordRegistrationAttempt: jest.fn(),
         recordTokenOperation: jest.fn(),
         recordOtpOperation: jest.fn(),
         recordSessionOperation: jest.fn(),
         setActiveSessions: jest.fn(),
         setLockedAccounts: jest.fn(),
         setOutboxPending: jest.fn(),
         observeTokenGeneration: jest.fn(),
         observeLoginDuration: jest.fn(),
         observePasswordHash: jest.fn(),
         observeOtpOperation: jest.fn(),
         startTimer: jest.fn().mockReturnValue(12345),
         calculateDuration: jest.fn().mockReturnValue(0.5),
         reset: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
         controllers: [AuthMetricsController],
         providers: [
            {
               provide: AUTH_METRICS_SERVICE,
               useValue: mockMetricsService,
            },
         ],
      }).compile();

      controller = module.get<AuthMetricsController>(AuthMetricsController);
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
      expect(sendMock).toHaveBeenCalledWith('# HELP test metric\n');
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
