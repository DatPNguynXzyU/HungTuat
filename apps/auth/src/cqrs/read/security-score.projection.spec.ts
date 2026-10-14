import { Test, type TestingModule } from '@nestjs/testing';
import { AccountSecurityScoreProjection } from '@auth/cqrs/read/security-score.projection';
import { PrismaService } from '@auth/prisma/prisma.service';
import { AUDIT_ACTIONS, SECURITY_RISK_LEVELS } from '@contracts/auth';
import type { CreateAuditLogData } from '@auth/entities/audit-log.entity';

describe('AccountSecurityScoreProjection', () => {
   let projection: AccountSecurityScoreProjection;
   let prisma: {
      accountSecurityScore: {
         findUnique: jest.Mock;
         upsert: jest.Mock;
      };
   };

   beforeEach(async () => {
      prisma = {
         accountSecurityScore: {
            findUnique: jest.fn(),
            upsert: jest.fn(),
         },
      };

      const module: TestingModule = await Test.createTestingModule({
         providers: [AccountSecurityScoreProjection, { provide: PrismaService, useValue: prisma }],
      }).compile();

      projection = module.get<AccountSecurityScoreProjection>(AccountSecurityScoreProjection);
   });

   describe('project', () => {
      it('should return null and do nothing if event has no accountId', async () => {
         const event: CreateAuditLogData = {
            action: AUDIT_ACTIONS.AUTH_LOGIN_FAILED,
         };

         const result = await projection.project(event);

         expect(result).toBeNull();
         expect(prisma.accountSecurityScore.upsert).not.toHaveBeenCalled();
      });

      it('should calculate and upsert score on AUTH_LOGIN_FAILED', async () => {
         const event: CreateAuditLogData = {
            accountId: 'acc-1',
            action: AUDIT_ACTIONS.AUTH_LOGIN_FAILED,
         };

         prisma.accountSecurityScore.findUnique.mockResolvedValue(null);
         prisma.accountSecurityScore.upsert.mockImplementation(({ create }) => Promise.resolve(create));

         const result = await projection.project(event);

         expect(prisma.accountSecurityScore.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
               where: { accountId: 'acc-1' },
               create: expect.objectContaining({
                  accountId: 'acc-1',
                  failedLoginAttempts: 1,
                  score: 95,
                  riskLevel: SECURITY_RISK_LEVELS.LOW,
               }) as unknown,
            }),
         );
         expect(result?.failedLoginAttempts).toBe(1);
         expect(result?.score).toBe(95);
      });

      it('should reset failedLoginAttempts on AUTH_LOGIN_SUCCESS', async () => {
         const event: CreateAuditLogData = {
            accountId: 'acc-1',
            action: AUDIT_ACTIONS.AUTH_LOGIN_SUCCESS,
         };

         prisma.accountSecurityScore.findUnique.mockResolvedValue({
            accountId: 'acc-1',
            failedLoginAttempts: 5,
            successfulLogins: 2,
            passwordChanges: 1,
            suspiciousActivities: 0,
            score: 75,
            riskLevel: SECURITY_RISK_LEVELS.MEDIUM,
         });

         prisma.accountSecurityScore.upsert.mockImplementation(({ update }) =>
            Promise.resolve({ accountId: 'acc-1', ...update }),
         );

         const result = await projection.project(event);

         expect(result?.failedLoginAttempts).toBe(0);
         expect(result?.successfulLogins).toBe(3);
         expect(result?.score).toBe(100);
         expect(result?.riskLevel).toBe(SECURITY_RISK_LEVELS.LOW);
      });

      it('should increment suspiciousActivities on AUTH_ACCOUNT_LOCKED and downgrade risk level', async () => {
         const event: CreateAuditLogData = {
            accountId: 'acc-1',
            action: AUDIT_ACTIONS.AUTH_ACCOUNT_LOCKED,
         };

         prisma.accountSecurityScore.findUnique.mockResolvedValue({
            accountId: 'acc-1',
            failedLoginAttempts: 6,
            successfulLogins: 0,
            passwordChanges: 0,
            suspiciousActivities: 3,
            score: 40,
            riskLevel: SECURITY_RISK_LEVELS.HIGH,
         });

         prisma.accountSecurityScore.upsert.mockImplementation(({ update }) =>
            Promise.resolve({ accountId: 'acc-1', ...update }),
         );

         const result = await projection.project(event);

         expect(result?.suspiciousActivities).toBe(4);
         expect(result?.riskLevel).toBe(SECURITY_RISK_LEVELS.CRITICAL);
      });

      it('should handle projection errors gracefully', async () => {
         const event: CreateAuditLogData = {
            accountId: 'acc-1',
            action: AUDIT_ACTIONS.AUTH_LOGIN_SUCCESS,
         };

         prisma.accountSecurityScore.findUnique.mockRejectedValue(new Error('DB failure'));

         const result = await projection.project(event);

         expect(result).toBeNull();
      });
   });

   describe('calculateScore', () => {
      it('should calculate accurate scores across risk levels', () => {
         // Low risk
         expect(
            projection.calculateScore({
               failedLoginAttempts: 0,
               suspiciousActivities: 0,
               successfulLogins: 10,
               passwordChanges: 1,
            }),
         ).toEqual({ score: 100, riskLevel: SECURITY_RISK_LEVELS.LOW });

         // Medium risk
         expect(
            projection.calculateScore({
               failedLoginAttempts: 4,
               suspiciousActivities: 1,
               successfulLogins: 0,
               passwordChanges: 0,
            }),
         ).toEqual({ score: 70, riskLevel: SECURITY_RISK_LEVELS.MEDIUM });

         // High risk
         expect(
            projection.calculateScore({
               failedLoginAttempts: 6,
               suspiciousActivities: 2,
               successfulLogins: 0,
               passwordChanges: 0,
            }),
         ).toEqual({ score: 50, riskLevel: SECURITY_RISK_LEVELS.HIGH });

         // Critical risk
         expect(
            projection.calculateScore({
               failedLoginAttempts: 6,
               suspiciousActivities: 4,
               successfulLogins: 0,
               passwordChanges: 0,
            }),
         ).toEqual({ score: 30, riskLevel: SECURITY_RISK_LEVELS.CRITICAL });
      });
   });

   describe('getScore', () => {
      it('should return null when no score exists for account', async () => {
         prisma.accountSecurityScore.findUnique.mockResolvedValue(null);

         const result = await projection.getScore('acc-unknown');

         expect(result).toBeNull();
      });

      it('should return security score when found', async () => {
         const now = new Date();
         prisma.accountSecurityScore.findUnique.mockResolvedValue({
            accountId: 'acc-1',
            score: 90,
            riskLevel: SECURITY_RISK_LEVELS.LOW,
            failedLoginAttempts: 0,
            successfulLogins: 5,
            passwordChanges: 1,
            suspiciousActivities: 0,
            lastUpdated: now,
         });

         const result = await projection.getScore('acc-1');

         expect(result).toEqual({
            accountId: 'acc-1',
            score: 90,
            riskLevel: SECURITY_RISK_LEVELS.LOW,
            failedLoginAttempts: 0,
            successfulLogins: 5,
            passwordChanges: 1,
            suspiciousActivities: 0,
            lastUpdated: now,
         });
      });
   });
});
