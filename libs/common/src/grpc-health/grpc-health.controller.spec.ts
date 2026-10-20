import { ServingStatus } from '@contracts/health';
import { GrpcHealthController } from '@common/grpc-health/grpc-health.controller';
import type { GrpcHealthService } from '@common/grpc-health/grpc-health.service';
import { firstValueFrom, of } from 'rxjs';

describe('GrpcHealthController', () => {
   let controller: GrpcHealthController;
   let mockHealthService: {
      check: jest.Mock;
      watch: jest.Mock;
   };

   beforeEach(() => {
      mockHealthService = {
         check: jest.fn(),
         watch: jest.fn(),
      };
      controller = new GrpcHealthController(mockHealthService as unknown as GrpcHealthService);
   });

   it('should delegate check request to healthService.check', async () => {
      mockHealthService.check.mockResolvedValue({ status: ServingStatus.SERVING });

      const res = await firstValueFrom(controller.check({ service: 'auth.v1.AuthService' }));

      expect(res.status).toBe(ServingStatus.SERVING);
      expect(mockHealthService.check).toHaveBeenCalledWith('auth.v1.AuthService');
   });

   it('should delegate watch request to healthService.watch', (done) => {
      mockHealthService.watch.mockReturnValue(of({ status: ServingStatus.SERVING }));

      const stream$ = controller.watch({ service: '' });
      expect(mockHealthService.watch).toHaveBeenCalledWith('');

      stream$.subscribe({
         next: (res) => {
            expect(res.status).toBe(ServingStatus.SERVING);
            done();
         },
      });
   });
});
