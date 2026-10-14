import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AUDIT_ACTIONS } from '@contracts/auth';
import { RedisService } from '@common/redis/redis.service';
import { AUTH_REDIS_TTL, AuthRedisKeys, THREAT_METRICS_FIELDS } from '@auth/constants/auth-redis-keys.constant';
import { AUDIT_CQRS_EVENTS } from '@auth/cqrs/constants/audit-cqrs.constant';
import type { CreateAuditLogData } from '@auth/entities/audit-log.entity';

export interface ThreatMetrics {
   date: string; // YYYY-MM-DD
   totalFailedLogins: number;
   uniqueLockedAccounts: number;
   suspiciousIps: string[];
   topFailureReasons: Record<string, number>;
}

@Injectable()
export class ThreatDetectionMetricsProjection {
   private readonly logger = new Logger(ThreatDetectionMetricsProjection.name);

   /** Maximum number of suspicious IP addresses tracked in the sorted set per day */
   public static readonly MAX_TRACKED_IPS = 1000;

   /** Maximum number of top offending suspicious IPs returned in reporting queries */
   public static readonly MAX_TOP_IPS = 100;

   private static readonly MAX_IP_LENGTH = 45;
   private static readonly MAX_REASON_LENGTH = 64;

   constructor(private readonly redisService: RedisService) {}

   @OnEvent(AUDIT_CQRS_EVENTS.EVENT_APPENDED)
   async project(event: CreateAuditLogData): Promise<void> {
      try {
         const today = (event.createdAt ? new Date(event.createdAt) : new Date()).toISOString().split('T')[0];

         const metricsKey = AuthRedisKeys.threatMetrics(today);
         const ipsKey = AuthRedisKeys.threatIps(today);
         const reasonsKey = AuthRedisKeys.threatReasons(today);
         const ttl = AUTH_REDIS_TTL.THREAT_METRICS;

         const client = this.redisService.getClient();

         if (client) {
            const pipeline = client.pipeline();

            if (event.action === AUDIT_ACTIONS.AUTH_LOGIN_FAILED) {
               pipeline.hincrby(metricsKey, THREAT_METRICS_FIELDS.TOTAL_FAILED_LOGINS, 1);
               pipeline.expire(metricsKey, ttl);

               const sanitizedIp = this.sanitizeIp(event.ipAddress);
               if (sanitizedIp) {
                  // Use Sorted Set (ZSET) with strike frequencies instead of unbounded SADD
                  pipeline.zincrby(ipsKey, 1, sanitizedIp);
                  // Bound the ZSET to MAX_TRACKED_IPS to prevent memory exhaustion and DoS
                  pipeline.zremrangebyrank(ipsKey, 0, -(ThreatDetectionMetricsProjection.MAX_TRACKED_IPS + 1));
                  pipeline.expire(ipsKey, ttl);
               }

               const sanitizedReason = this.sanitizeReason(event.reason);
               if (sanitizedReason) {
                  pipeline.hincrby(reasonsKey, sanitizedReason, 1);
                  pipeline.expire(reasonsKey, ttl);
               }
            } else if (event.action === AUDIT_ACTIONS.AUTH_ACCOUNT_LOCKED) {
               pipeline.hincrby(metricsKey, THREAT_METRICS_FIELDS.UNIQUE_LOCKED_ACCOUNTS, 1);
               pipeline.expire(metricsKey, ttl);
            }

            // Single atomic roundtrip pipeline
            await pipeline.exec();
         } else {
            // Fallback for mocked test environments without raw Redis client
            if (event.action === AUDIT_ACTIONS.AUTH_LOGIN_FAILED) {
               await this.redisService.hincrby(metricsKey, THREAT_METRICS_FIELDS.TOTAL_FAILED_LOGINS, 1);
               await this.redisService.expire(metricsKey, ttl);

               const sanitizedIp = this.sanitizeIp(event.ipAddress);
               if (sanitizedIp) {
                  await this.redisService.zincrby(ipsKey, 1, sanitizedIp);
                  await this.redisService.zremrangebyrank(
                     ipsKey,
                     0,
                     -(ThreatDetectionMetricsProjection.MAX_TRACKED_IPS + 1),
                  );
                  await this.redisService.expire(ipsKey, ttl);
               }

               const sanitizedReason = this.sanitizeReason(event.reason);
               if (sanitizedReason) {
                  await this.redisService.hincrby(reasonsKey, sanitizedReason, 1);
                  await this.redisService.expire(reasonsKey, ttl);
               }
            } else if (event.action === AUDIT_ACTIONS.AUTH_ACCOUNT_LOCKED) {
               await this.redisService.hincrby(metricsKey, THREAT_METRICS_FIELDS.UNIQUE_LOCKED_ACCOUNTS, 1);
               await this.redisService.expire(metricsKey, ttl);
            }
         }
      } catch (error: unknown) {
         const err = error as Error;
         this.logger.error(`Failed to project threat metrics: ${err.message}`, err.stack);
      }
   }

   async getMetricsByDate(date: string): Promise<ThreatMetrics> {
      const metricsKey = AuthRedisKeys.threatMetrics(date);
      const ipsKey = AuthRedisKeys.threatIps(date);
      const reasonsKey = AuthRedisKeys.threatReasons(date);

      // Query top suspicious IPs safely via bounded ZREVRANGE (O(log N + M))
      const [metrics, suspiciousIps, reasons] = await Promise.all([
         this.redisService.hgetall(metricsKey),
         this.redisService.zrevrange(ipsKey, 0, ThreatDetectionMetricsProjection.MAX_TOP_IPS - 1),
         this.redisService.hgetall(reasonsKey),
      ]);

      const parsedReasons: Record<string, number> = {};
      if (reasons) {
         for (const [key, val] of Object.entries(reasons)) {
            parsedReasons[key] = parseInt(val, 10) || 0;
         }
      }

      return {
         date,
         totalFailedLogins: parseInt(metrics?.[THREAT_METRICS_FIELDS.TOTAL_FAILED_LOGINS] || '0', 10),
         uniqueLockedAccounts: parseInt(metrics?.[THREAT_METRICS_FIELDS.UNIQUE_LOCKED_ACCOUNTS] || '0', 10),
         suspiciousIps: suspiciousIps || [],
         topFailureReasons: parsedReasons,
      };
   }

   async getTodayMetrics(): Promise<ThreatMetrics> {
      const today = new Date().toISOString().split('T')[0];
      return this.getMetricsByDate(today);
   }

   private sanitizeIp(ip?: string | null): string | null {
      if (!ip) return null;
      const trimmed = ip.trim().slice(0, ThreatDetectionMetricsProjection.MAX_IP_LENGTH);
      return trimmed.length > 0 ? trimmed : null;
   }

   private sanitizeReason(reason?: string | null): string | null {
      if (!reason) return null;
      const trimmed = reason.trim().slice(0, ThreatDetectionMetricsProjection.MAX_REASON_LENGTH);
      return trimmed.length > 0 ? trimmed : null;
   }
}
