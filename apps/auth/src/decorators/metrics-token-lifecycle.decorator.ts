import { Inject, Injectable } from '@nestjs/common';
import type { IDeviceInfo, JwtPayload } from '@common';
import { AUTH_METRICS_STATUS, AUTH_METRICS_TOKEN_OPERATIONS, AUTH_METRICS_TOKEN_TYPES } from '@auth/constants';
import { AUTH_METRICS_SERVICE, type IAuthMetricsService } from '@auth/services/infrastructure/auth-metrics.interface';
import {
   ITokenAccountPayload,
   type ITokenLifecycleService,
   TokenPair,
} from '@auth/services/infrastructure/token.service.interface';

/**
 * Decorator Pattern: MetricsTokenLifecycleDecorator
 *
 * Transparently wraps ITokenLifecycleService to record token generation metrics,
 * operation latency, and success/failure counters without polluting core token logic.
 */
@Injectable()
export class MetricsTokenLifecycleDecorator implements ITokenLifecycleService {
   constructor(
      private readonly inner: ITokenLifecycleService,
      @Inject(AUTH_METRICS_SERVICE)
      private readonly metricsService: IAuthMetricsService,
   ) {}

   async generateTokenPair(account: ITokenAccountPayload, deviceInfo?: IDeviceInfo): Promise<TokenPair> {
      const startTime = this.metricsService.startTimer();
      try {
         const result = await this.inner.generateTokenPair(account, deviceInfo);
         this.metricsService.observeTokenGeneration(
            AUTH_METRICS_TOKEN_TYPES.ACCESS,
            this.metricsService.calculateDuration(startTime),
         );
         this.metricsService.recordTokenOperation(AUTH_METRICS_TOKEN_OPERATIONS.GENERATE, AUTH_METRICS_STATUS.SUCCESS);
         return result;
      } catch (error) {
         this.metricsService.recordTokenOperation(AUTH_METRICS_TOKEN_OPERATIONS.GENERATE, AUTH_METRICS_STATUS.FAILURE);
         throw error;
      }
   }

   async rotateTokenPair(
      account: ITokenAccountPayload,
      oldRefreshTokenJti: string,
      deviceInfo?: IDeviceInfo,
      remainingTtl?: number,
   ): Promise<TokenPair> {
      const startTime = this.metricsService.startTimer();
      try {
         const result = await this.inner.rotateTokenPair(account, oldRefreshTokenJti, deviceInfo, remainingTtl);
         this.metricsService.observeTokenGeneration(
            AUTH_METRICS_TOKEN_TYPES.ACCESS,
            this.metricsService.calculateDuration(startTime),
         );
         this.metricsService.recordTokenOperation(AUTH_METRICS_TOKEN_OPERATIONS.REFRESH, AUTH_METRICS_STATUS.SUCCESS);
         return result;
      } catch (error) {
         this.metricsService.recordTokenOperation(AUTH_METRICS_TOKEN_OPERATIONS.REFRESH, AUTH_METRICS_STATUS.FAILURE);
         throw error;
      }
   }

   async revokeToken(token: string): Promise<void> {
      try {
         await this.inner.revokeToken(token);
         this.metricsService.recordTokenOperation(AUTH_METRICS_TOKEN_OPERATIONS.REVOKE, AUTH_METRICS_STATUS.SUCCESS);
      } catch (error) {
         this.metricsService.recordTokenOperation(AUTH_METRICS_TOKEN_OPERATIONS.REVOKE, AUTH_METRICS_STATUS.FAILURE);
         throw error;
      }
   }

   validateAccessToken(token: string): Promise<JwtPayload> {
      return this.inner.validateAccessToken(token);
   }

   validateRefreshToken(token: string): Promise<JwtPayload> {
      return this.inner.validateRefreshToken(token);
   }

   isTokenRevoked(jti: string): Promise<boolean> {
      return this.inner.isTokenRevoked(jti);
   }

   invalidateRefreshToken(accountId: string, jti: string, remainingTtl?: number): Promise<void> {
      return this.inner.invalidateRefreshToken(accountId, jti, remainingTtl);
   }

   revokeAllAccountTokens(accountId: string): Promise<void> {
      return this.inner.revokeAllAccountTokens(accountId);
   }

   logoutAll(accountId: string): Promise<void> {
      return this.inner.logoutAll(accountId);
   }
}
