import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AUDIT_ACTIONS, SECURITY_RISK_LEVELS, type SecurityRiskLevel } from '@contracts/auth';
import { PrismaService } from '@auth/prisma/prisma.service';
import { AUDIT_CQRS_EVENTS } from '@auth/cqrs/constants/audit-cqrs.constant';
import type { CreateAuditLogData } from '@auth/entities/audit-log.entity';

export { SECURITY_RISK_LEVELS, type SecurityRiskLevel };

export const SECURITY_SCORE_THRESHOLDS = {
   BASE_SCORE: 100,
   MIN_SCORE: 0,
   MAX_SCORE: 100,
   LOW_RISK_MIN: 80,
   MEDIUM_RISK_MIN: 60,
   HIGH_RISK_MIN: 40,
   MAX_FAILED_LOGIN_DEDUCTION: 30,
   MAX_SUSPICIOUS_DEDUCTION: 40,
   MAX_SUCCESSFUL_LOGIN_BONUS: 10,
   MAX_PASSWORD_CHANGE_BONUS: 10,
   FAILED_LOGIN_MULTIPLIER: 5,
   SUSPICIOUS_MULTIPLIER: 10,
   SUCCESSFUL_LOGIN_MULTIPLIER: 0.1,
   PASSWORD_CHANGE_MULTIPLIER: 2,
} as const;

export interface AccountSecurityScoreResult {
   accountId: string;
   score: number;
   riskLevel: SecurityRiskLevel;
   failedLoginAttempts: number;
   successfulLogins: number;
   passwordChanges: number;
   suspiciousActivities: number;
   lastUpdated: Date;
}

@Injectable()
export class AccountSecurityScoreProjection {
   private readonly logger = new Logger(AccountSecurityScoreProjection.name);

   constructor(private readonly prisma: PrismaService) {}

   @OnEvent(AUDIT_CQRS_EVENTS.EVENT_APPENDED)
   async project(event: CreateAuditLogData): Promise<AccountSecurityScoreResult | null> {
      if (!event.accountId) {
         return null;
      }

      try {
         const existing = await this.prisma.accountSecurityScore.findUnique({
            where: { accountId: event.accountId },
         });

         const metrics = this.computeUpdatedMetrics(event, existing);
         const { score, riskLevel } = this.calculateScore(metrics);
         const lastUpdated = new Date();

         const saved = await this.prisma.accountSecurityScore.upsert({
            where: { accountId: event.accountId },
            create: {
               accountId: event.accountId,
               score,
               riskLevel,
               failedLoginAttempts: metrics.failedLoginAttempts,
               successfulLogins: metrics.successfulLogins,
               passwordChanges: metrics.passwordChanges,
               suspiciousActivities: metrics.suspiciousActivities,
               lastUpdated,
            },
            update: {
               score,
               riskLevel,
               failedLoginAttempts: metrics.failedLoginAttempts,
               successfulLogins: metrics.successfulLogins,
               passwordChanges: metrics.passwordChanges,
               suspiciousActivities: metrics.suspiciousActivities,
               lastUpdated,
            },
         });

         return {
            accountId: saved.accountId,
            score: saved.score,
            riskLevel: saved.riskLevel as SecurityRiskLevel,
            failedLoginAttempts: saved.failedLoginAttempts,
            successfulLogins: saved.successfulLogins,
            passwordChanges: saved.passwordChanges,
            suspiciousActivities: saved.suspiciousActivities,
            lastUpdated: saved.lastUpdated,
         };
      } catch (error: unknown) {
         const err = error as Error;
         this.logger.error(
            `Failed to project security score for account ${event.accountId}: ${err.message}`,
            err.stack,
         );
         return null;
      }
   }

   async getScore(accountId: string): Promise<AccountSecurityScoreResult | null> {
      const score = await this.prisma.accountSecurityScore.findUnique({
         where: { accountId },
      });

      if (!score) return null;

      return {
         accountId: score.accountId,
         score: score.score,
         riskLevel: score.riskLevel as SecurityRiskLevel,
         failedLoginAttempts: score.failedLoginAttempts,
         successfulLogins: score.successfulLogins,
         passwordChanges: score.passwordChanges,
         suspiciousActivities: score.suspiciousActivities,
         lastUpdated: score.lastUpdated,
      };
   }

   computeUpdatedMetrics(
      event: CreateAuditLogData,
      existing: {
         failedLoginAttempts: number;
         successfulLogins: number;
         passwordChanges: number;
         suspiciousActivities: number;
      } | null,
   ): {
      failedLoginAttempts: number;
      successfulLogins: number;
      passwordChanges: number;
      suspiciousActivities: number;
   } {
      let failedLoginAttempts = existing?.failedLoginAttempts ?? 0;
      let successfulLogins = existing?.successfulLogins ?? 0;
      let passwordChanges = existing?.passwordChanges ?? 0;
      let suspiciousActivities = existing?.suspiciousActivities ?? 0;

      if (event.action === AUDIT_ACTIONS.AUTH_LOGIN_FAILED) {
         failedLoginAttempts += 1;
      } else if (event.action === AUDIT_ACTIONS.AUTH_LOGIN_SUCCESS) {
         successfulLogins += 1;
         failedLoginAttempts = 0; // Reset on successful login
      } else if (event.action === AUDIT_ACTIONS.AUTH_PASSWORD_CHANGE) {
         passwordChanges += 1;
      } else if (event.action === AUDIT_ACTIONS.AUTH_ACCOUNT_LOCKED || event.action === AUDIT_ACTIONS.AUTH_OTP_FAILED) {
         suspiciousActivities += 1;
      }

      return {
         failedLoginAttempts,
         successfulLogins,
         passwordChanges,
         suspiciousActivities,
      };
   }

   calculateScore(metrics: {
      failedLoginAttempts: number;
      suspiciousActivities: number;
      successfulLogins: number;
      passwordChanges: number;
   }): { score: number; riskLevel: SecurityRiskLevel } {
      let score: number = SECURITY_SCORE_THRESHOLDS.BASE_SCORE;

      // Deduct points for risky behavior
      score -= Math.min(
         metrics.failedLoginAttempts * SECURITY_SCORE_THRESHOLDS.FAILED_LOGIN_MULTIPLIER,
         SECURITY_SCORE_THRESHOLDS.MAX_FAILED_LOGIN_DEDUCTION,
      );
      score -= Math.min(
         metrics.suspiciousActivities * SECURITY_SCORE_THRESHOLDS.SUSPICIOUS_MULTIPLIER,
         SECURITY_SCORE_THRESHOLDS.MAX_SUSPICIOUS_DEDUCTION,
      );

      // Add points for positive security behavior
      score += Math.min(
         metrics.successfulLogins * SECURITY_SCORE_THRESHOLDS.SUCCESSFUL_LOGIN_MULTIPLIER,
         SECURITY_SCORE_THRESHOLDS.MAX_SUCCESSFUL_LOGIN_BONUS,
      );
      score += Math.min(
         metrics.passwordChanges * SECURITY_SCORE_THRESHOLDS.PASSWORD_CHANGE_MULTIPLIER,
         SECURITY_SCORE_THRESHOLDS.MAX_PASSWORD_CHANGE_BONUS,
      );

      score = Math.max(SECURITY_SCORE_THRESHOLDS.MIN_SCORE, Math.min(SECURITY_SCORE_THRESHOLDS.MAX_SCORE, score));

      let riskLevel: SecurityRiskLevel;
      if (score >= SECURITY_SCORE_THRESHOLDS.LOW_RISK_MIN) {
         riskLevel = SECURITY_RISK_LEVELS.LOW;
      } else if (score >= SECURITY_SCORE_THRESHOLDS.MEDIUM_RISK_MIN) {
         riskLevel = SECURITY_RISK_LEVELS.MEDIUM;
      } else if (score >= SECURITY_SCORE_THRESHOLDS.HIGH_RISK_MIN) {
         riskLevel = SECURITY_RISK_LEVELS.HIGH;
      } else {
         riskLevel = SECURITY_RISK_LEVELS.CRITICAL;
      }

      return { score: Math.round(score), riskLevel };
   }
}
