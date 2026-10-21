import { DEFAULT_ROLES, type JwtPayload } from '@common';
import { AUTH_METRICS_STATUS, AUTH_METRICS_TOKEN_OPERATIONS, AUTH_METRICS_TOKEN_TYPES } from '@auth/constants';
import type { IAuthMetricsService } from '@auth/services/infrastructure/auth-metrics.interface';
import type {
   ITokenAccountPayload,
   ITokenLifecycleService,
} from '@auth/services/infrastructure/token.service.interface';
import { MetricsTokenLifecycleDecorator } from '@auth/decorators/metrics-token-lifecycle.decorator';

describe('MetricsTokenLifecycleDecorator', () => {
   let decorator: MetricsTokenLifecycleDecorator;
   let mockInner: jest.Mocked<ITokenLifecycleService>;
   let mockMetricsService: jest.Mocked<IAuthMetricsService>;

   const mockAccount: ITokenAccountPayload = {
      id: 'acc-1',
      email: 'test@example.com',
      roles: [DEFAULT_ROLES.USER],
   };

   beforeEach(() => {
      mockInner = {
         generateTokenPair: jest.fn(),
         rotateTokenPair: jest.fn(),
         revokeToken: jest.fn(),
         validateAccessToken: jest.fn(),
         validateRefreshToken: jest.fn(),
         isTokenRevoked: jest.fn(),
         invalidateRefreshToken: jest.fn(),
         revokeAllAccountTokens: jest.fn(),
         logoutAll: jest.fn(),
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
         startTimer: jest.fn().mockReturnValue(100),
         calculateDuration: jest.fn().mockReturnValue(0.05),
         reset: jest.fn(),
      };

      decorator = new MetricsTokenLifecycleDecorator(mockInner, mockMetricsService);
   });

   describe('generateTokenPair', () => {
      it('should record success and duration when token generation succeeds', async () => {
         const expectedTokens = { accessToken: 'at-1', refreshToken: 'rt-1' };
         mockInner.generateTokenPair.mockResolvedValue(expectedTokens);

         const result = await decorator.generateTokenPair(mockAccount);

         expect(result).toEqual(expectedTokens);
         expect(mockMetricsService.startTimer).toHaveBeenCalled();
         expect(mockMetricsService.observeTokenGeneration).toHaveBeenCalledWith(AUTH_METRICS_TOKEN_TYPES.ACCESS, 0.05);
         expect(mockMetricsService.recordTokenOperation).toHaveBeenCalledWith(
            AUTH_METRICS_TOKEN_OPERATIONS.GENERATE,
            AUTH_METRICS_STATUS.SUCCESS,
         );
      });

      it('should record failure and rethrow when token generation fails', async () => {
         const error = new Error('Generation failed');
         mockInner.generateTokenPair.mockRejectedValue(error);

         await expect(decorator.generateTokenPair(mockAccount)).rejects.toThrow(error);

         expect(mockMetricsService.recordTokenOperation).toHaveBeenCalledWith(
            AUTH_METRICS_TOKEN_OPERATIONS.GENERATE,
            AUTH_METRICS_STATUS.FAILURE,
         );
      });
   });

   describe('rotateTokenPair', () => {
      it('should record refresh success and duration', async () => {
         const expectedTokens = { accessToken: 'at-2', refreshToken: 'rt-2' };
         mockInner.rotateTokenPair.mockResolvedValue(expectedTokens);

         const result = await decorator.rotateTokenPair(mockAccount, 'old-jti');

         expect(result).toEqual(expectedTokens);
         expect(mockMetricsService.observeTokenGeneration).toHaveBeenCalledWith(AUTH_METRICS_TOKEN_TYPES.ACCESS, 0.05);
         expect(mockMetricsService.recordTokenOperation).toHaveBeenCalledWith(
            AUTH_METRICS_TOKEN_OPERATIONS.REFRESH,
            AUTH_METRICS_STATUS.SUCCESS,
         );
      });

      it('should record refresh failure and rethrow', async () => {
         const error = new Error('Refresh failed');
         mockInner.rotateTokenPair.mockRejectedValue(error);

         await expect(decorator.rotateTokenPair(mockAccount, 'old-jti')).rejects.toThrow(error);

         expect(mockMetricsService.recordTokenOperation).toHaveBeenCalledWith(
            AUTH_METRICS_TOKEN_OPERATIONS.REFRESH,
            AUTH_METRICS_STATUS.FAILURE,
         );
      });
   });

   describe('revokeToken', () => {
      it('should record revoke success', async () => {
         mockInner.revokeToken.mockResolvedValue();

         await decorator.revokeToken('valid-token');

         expect(mockMetricsService.recordTokenOperation).toHaveBeenCalledWith(
            AUTH_METRICS_TOKEN_OPERATIONS.REVOKE,
            AUTH_METRICS_STATUS.SUCCESS,
         );
      });

      it('should record revoke failure and rethrow', async () => {
         const error = new Error('Revoke failed');
         mockInner.revokeToken.mockRejectedValue(error);

         await expect(decorator.revokeToken('invalid-token')).rejects.toThrow(error);

         expect(mockMetricsService.recordTokenOperation).toHaveBeenCalledWith(
            AUTH_METRICS_TOKEN_OPERATIONS.REVOKE,
            AUTH_METRICS_STATUS.FAILURE,
         );
      });
   });

   describe('method delegation', () => {
      it('should delegate validateAccessToken to inner', async () => {
         const payload = { sub: 'acc-1' } as JwtPayload;
         mockInner.validateAccessToken.mockResolvedValue(payload);

         const result = await decorator.validateAccessToken('token');

         expect(result).toBe(payload);
         expect(mockInner.validateAccessToken).toHaveBeenCalledWith('token');
      });

      it('should delegate validateRefreshToken to inner', async () => {
         const payload = { sub: 'acc-1' } as JwtPayload;
         mockInner.validateRefreshToken.mockResolvedValue(payload);

         const result = await decorator.validateRefreshToken('token');

         expect(result).toBe(payload);
         expect(mockInner.validateRefreshToken).toHaveBeenCalledWith('token');
      });

      it('should delegate isTokenRevoked, invalidateRefreshToken, revokeAllAccountTokens, logoutAll', async () => {
         mockInner.isTokenRevoked.mockResolvedValue(false);
         mockInner.invalidateRefreshToken.mockResolvedValue();
         mockInner.revokeAllAccountTokens.mockResolvedValue();
         mockInner.logoutAll.mockResolvedValue();

         expect(await decorator.isTokenRevoked('jti')).toBe(false);
         await decorator.invalidateRefreshToken('acc-1', 'jti');
         await decorator.revokeAllAccountTokens('acc-1');
         await decorator.logoutAll('acc-1');

         expect(mockInner.isTokenRevoked).toHaveBeenCalledWith('jti');
         expect(mockInner.invalidateRefreshToken).toHaveBeenCalledWith('acc-1', 'jti', undefined);
         expect(mockInner.revokeAllAccountTokens).toHaveBeenCalledWith('acc-1');
         expect(mockInner.logoutAll).toHaveBeenCalledWith('acc-1');
      });
   });
});
