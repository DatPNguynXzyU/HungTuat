import type { IAuthMetricsService } from '@auth/services/infrastructure/auth-metrics.interface';
import type { IPasswordHasher } from '@auth/services/infrastructure/password-hasher.interface';
import { MetricsPasswordHasherDecorator } from '@auth/decorators/metrics-password-hasher.decorator';

describe('MetricsPasswordHasherDecorator', () => {
   let decorator: MetricsPasswordHasherDecorator;
   let mockInner: jest.Mocked<IPasswordHasher>;
   let mockMetricsService: jest.Mocked<IAuthMetricsService>;

   beforeEach(() => {
      mockInner = {
         hash: jest.fn(),
         verify: jest.fn(),
      };

      mockMetricsService = {
         contentType: 'text/plain',
         getMetrics: jest.fn(),
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
         startTimer: jest.fn().mockReturnValue(1234),
         calculateDuration: jest.fn().mockReturnValue(0.12),
         reset: jest.fn(),
      };

      decorator = new MetricsPasswordHasherDecorator(mockInner, mockMetricsService);
   });

   describe('hash', () => {
      it('should measure hash duration and record metrics', async () => {
         mockInner.hash.mockResolvedValue('hashed_secret');

         const result = await decorator.hash('plain_password');

         expect(result).toBe('hashed_secret');
         expect(mockInner.hash).toHaveBeenCalledWith('plain_password');
         expect(mockMetricsService.startTimer).toHaveBeenCalled();
         expect(mockMetricsService.calculateDuration).toHaveBeenCalledWith(1234);
         expect(mockMetricsService.observePasswordHash).toHaveBeenCalledWith(0.12);
      });

      it('should rethrow error if inner hash fails', async () => {
         const error = new Error('Hash failed');
         mockInner.hash.mockRejectedValue(error);

         await expect(decorator.hash('plain_password')).rejects.toThrow(error);
      });
   });

   describe('verify', () => {
      it('should delegate verify to inner without extra metrics', async () => {
         mockInner.verify.mockResolvedValue(true);

         const result = await decorator.verify('hash', 'plain');

         expect(result).toBe(true);
         expect(mockInner.verify).toHaveBeenCalledWith('hash', 'plain');
      });
   });
});
