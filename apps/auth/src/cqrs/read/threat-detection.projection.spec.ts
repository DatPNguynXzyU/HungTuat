import { Test, type TestingModule } from '@nestjs/testing';
import { ThreatDetectionMetricsProjection } from '@auth/cqrs/read/threat-detection.projection';
import { RedisService } from '@common/redis/redis.service';
import { AUDIT_ACTIONS, AUTH_ERROR_CODES } from '@contracts/auth';
import { AUTH_REDIS_TTL, AuthRedisKeys, THREAT_METRICS_FIELDS } from '@auth/constants/auth-redis-keys.constant';
import type { CreateAuditLogData } from '@auth/entities/audit-log.entity';

describe('ThreatDetectionMetricsProjection', () => {
   let projection: ThreatDetectionMetricsProjection;
   let redisService: {
      getClient: jest.Mock;
      hincrby: jest.Mock;
      zincrby: jest.Mock;
      zrevrange: jest.Mock;
      zremrangebyrank: jest.Mock;
      expire: jest.Mock;
      hgetall: jest.Mock;
   };
   let mockPipeline: {
      hincrby: jest.Mock;
      zincrby: jest.Mock;
      zremrangebyrank: jest.Mock;
      expire: jest.Mock;
      exec: jest.Mock;
   };

   beforeEach(async () => {
      mockPipeline = {
         hincrby: jest.fn().mockReturnThis(),
         zincrby: jest.fn().mockReturnThis(),
         zremrangebyrank: jest.fn().mockReturnThis(),
         expire: jest.fn().mockReturnThis(),
         exec: jest.fn().mockResolvedValue([]),
      };

      redisService = {
         getClient: jest.fn().mockReturnValue({
            pipeline: jest.fn().mockReturnValue(mockPipeline),
         }),
         hincrby: jest.fn().mockResolvedValue(1),
         zincrby: jest.fn().mockResolvedValue('1'),
         zrevrange: jest.fn(),
         zremrangebyrank: jest.fn().mockResolvedValue(0),
         expire: jest.fn().mockResolvedValue(undefined),
         hgetall: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
         providers: [ThreatDetectionMetricsProjection, { provide: RedisService, useValue: redisService }],
      }).compile();

      projection = module.get<ThreatDetectionMetricsProjection>(ThreatDetectionMetricsProjection);
   });

   describe('project with pipeline', () => {
      it('should record failed login metrics using AuthRedisKeys in a single atomic pipeline', async () => {
         const date = '2026-10-14';
         const event: CreateAuditLogData = {
            action: AUDIT_ACTIONS.AUTH_LOGIN_FAILED,
            ipAddress: '192.168.1.1',
            reason: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
            createdAt: `${date}T08:00:00.000Z`,
         };

         await projection.project(event);

         const expectedMetricsKey = AuthRedisKeys.threatMetrics(date);
         const expectedIpsKey = AuthRedisKeys.threatIps(date);
         const expectedReasonsKey = AuthRedisKeys.threatReasons(date);
         const expectedTtl = AUTH_REDIS_TTL.THREAT_METRICS;

         expect(mockPipeline.hincrby).toHaveBeenCalledWith(
            expectedMetricsKey,
            THREAT_METRICS_FIELDS.TOTAL_FAILED_LOGINS,
            1,
         );
         expect(mockPipeline.expire).toHaveBeenCalledWith(expectedMetricsKey, expectedTtl);

         expect(mockPipeline.zincrby).toHaveBeenCalledWith(expectedIpsKey, 1, '192.168.1.1');
         expect(mockPipeline.zremrangebyrank).toHaveBeenCalledWith(
            expectedIpsKey,
            0,
            -(ThreatDetectionMetricsProjection.MAX_TRACKED_IPS + 1),
         );
         expect(mockPipeline.expire).toHaveBeenCalledWith(expectedIpsKey, expectedTtl);

         expect(mockPipeline.hincrby).toHaveBeenCalledWith(expectedReasonsKey, AUTH_ERROR_CODES.INVALID_CREDENTIALS, 1);
         expect(mockPipeline.expire).toHaveBeenCalledWith(expectedReasonsKey, expectedTtl);

         expect(mockPipeline.exec).toHaveBeenCalled();
      });

      it('should record unique locked accounts in pipeline', async () => {
         const date = '2026-10-14';
         const event: CreateAuditLogData = {
            action: AUDIT_ACTIONS.AUTH_ACCOUNT_LOCKED,
            createdAt: `${date}T09:00:00.000Z`,
         };

         await projection.project(event);

         expect(mockPipeline.hincrby).toHaveBeenCalledWith(
            AuthRedisKeys.threatMetrics(date),
            THREAT_METRICS_FIELDS.UNIQUE_LOCKED_ACCOUNTS,
            1,
         );
         expect(mockPipeline.exec).toHaveBeenCalled();
      });
   });

   describe('project fallback (without raw redis client)', () => {
      it('should use fallback methods when getClient returns null', async () => {
         redisService.getClient.mockReturnValue(null);
         const date = '2026-10-14';
         const event: CreateAuditLogData = {
            action: AUDIT_ACTIONS.AUTH_LOGIN_FAILED,
            ipAddress: '10.0.0.1',
            reason: AUTH_ERROR_CODES.USER_NOT_FOUND,
            createdAt: `${date}T10:00:00.000Z`,
         };

         await projection.project(event);

         expect(redisService.hincrby).toHaveBeenCalledWith(
            AuthRedisKeys.threatMetrics(date),
            THREAT_METRICS_FIELDS.TOTAL_FAILED_LOGINS,
            1,
         );
         expect(redisService.zincrby).toHaveBeenCalledWith(AuthRedisKeys.threatIps(date), 1, '10.0.0.1');
         expect(redisService.zremrangebyrank).toHaveBeenCalled();
      });
   });

   describe('getMetricsByDate / getTodayMetrics', () => {
      it('should query top suspicious IPs via bounded zrevrange', async () => {
         const date = '2026-10-14';
         redisService.hgetall.mockImplementation((key: string) => {
            if (key === AuthRedisKeys.threatMetrics(date)) {
               return Promise.resolve({
                  [THREAT_METRICS_FIELDS.TOTAL_FAILED_LOGINS]: '25',
                  [THREAT_METRICS_FIELDS.UNIQUE_LOCKED_ACCOUNTS]: '4',
               });
            }
            if (key === AuthRedisKeys.threatReasons(date)) {
               return Promise.resolve({
                  [AUTH_ERROR_CODES.INVALID_CREDENTIALS]: '20',
                  [AUTH_ERROR_CODES.ACCOUNT_LOCKED_TEMPORARILY]: '5',
               });
            }
            return Promise.resolve({});
         });

         redisService.zrevrange.mockResolvedValue(['192.168.1.1', '10.0.0.1']);

         const result = await projection.getMetricsByDate(date);

         expect(redisService.zrevrange).toHaveBeenCalledWith(
            AuthRedisKeys.threatIps(date),
            0,
            ThreatDetectionMetricsProjection.MAX_TOP_IPS - 1,
         );

         expect(result).toEqual({
            date,
            totalFailedLogins: 25,
            uniqueLockedAccounts: 4,
            suspiciousIps: ['192.168.1.1', '10.0.0.1'],
            topFailureReasons: {
               [AUTH_ERROR_CODES.INVALID_CREDENTIALS]: 20,
               [AUTH_ERROR_CODES.ACCOUNT_LOCKED_TEMPORARILY]: 5,
            },
         });
      });

      it('should fallback to 0 and empty data on empty cache', async () => {
         redisService.hgetall.mockResolvedValue({});
         redisService.zrevrange.mockResolvedValue([]);

         const result = await projection.getTodayMetrics();

         expect(result.totalFailedLogins).toBe(0);
         expect(result.uniqueLockedAccounts).toBe(0);
         expect(result.suspiciousIps).toEqual([]);
         expect(result.topFailureReasons).toEqual({});
      });
   });
});
