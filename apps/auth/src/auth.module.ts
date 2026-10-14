import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { RedisModule, RmqModule, SERVICES } from '@common';
import { AuthController } from '@auth/auth.controller';
import { AuthConfigModule } from '@auth/config';
import { AuthLoggerModule } from '@auth/logger';
import { OutboxModule } from '@auth/outbox';
import { PrismaModule } from '@auth/prisma';
import {
   ACCOUNT_REPOSITORY,
   AccountRepository,
   AUDIT_LOG_REPOSITORY,
   AuditLogRepository,
   RBAC_REPOSITORY,
   RbacRepository,
   SESSION_REPOSITORY,
   SessionRepository,
} from '@auth/repositories';
import {
   AUTH_METRICS_SERVICE,
   AUTH_RATE_LIMITER,
   AuthMetricsService,
   AuthRateLimiter,
   AuditLogService,
   EmailBloomFilterService,
   JWT_SERVICE,
   JwtService,
   PASSWORD_HASHER,
   PasswordHasherService,
   TOKEN_LIFECYCLE_SERVICE,
   TokenLifecycleService,
   VERIFICATION_TOKEN_SERVICE,
   VerificationTokenService,
} from '@auth/services/infrastructure';
import { AuthMetricsController } from '@auth/auth-metrics.controller';
import {
   AuthCoreService,
   AuthRegistrationService,
   PasswordManagementService,
   SessionManagementService,
} from '@auth/services/domain';
import {
   UserRegisteredEventHandler,
   AccountLockedEventHandler,
   PasswordChangedEventHandler,
   SessionRevokedEventHandler,
} from '@auth/domain/event-handlers';
import {
   AUDIT_EVENT_STORE,
   AuditEventStore,
   SecurityAuditLogProjection,
   AccountSecurityScoreProjection,
   ThreatDetectionMetricsProjection,
   AuditProjectionRebuildService,
} from '@auth/cqrs';

@Module({
   imports: [
      EventEmitterModule.forRoot({
         wildcard: true,
         delimiter: '.',
         maxListeners: 20,
      }),
      AuthConfigModule,
      AuthLoggerModule,
      PrismaModule,
      RedisModule,
      OutboxModule,
      RmqModule.register({
         name: SERVICES.NOTIFICATION_SERVICE,
      }),
   ],
   controllers: [AuthController, AuthMetricsController],
   providers: [
      // Domain Event Handlers
      UserRegisteredEventHandler,
      AccountLockedEventHandler,
      PasswordChangedEventHandler,
      SessionRevokedEventHandler,

      // Domain Services
      AuthCoreService,
      AuthRegistrationService,
      SessionManagementService,
      PasswordManagementService,

      // Infrastructure Services - Split Token Services
      JwtService,
      {
         provide: JWT_SERVICE,
         useExisting: JwtService,
      },
      VerificationTokenService,
      {
         provide: VERIFICATION_TOKEN_SERVICE,
         useExisting: VerificationTokenService,
      },
      TokenLifecycleService,
      {
         provide: TOKEN_LIFECYCLE_SERVICE,
         useExisting: TokenLifecycleService,
      },
      AuthRateLimiter,
      {
         provide: AUTH_RATE_LIMITER,
         useExisting: AuthRateLimiter,
      },
      AuthMetricsService,
      {
         provide: AUTH_METRICS_SERVICE,
         useExisting: AuthMetricsService,
      },
      PasswordHasherService,
      {
         provide: PASSWORD_HASHER,
         useExisting: PasswordHasherService,
      },
      AuditLogService,
      EmailBloomFilterService,

      // CQRS Audit Log Components
      AuditEventStore,
      {
         provide: AUDIT_EVENT_STORE,
         useExisting: AuditEventStore,
      },
      SecurityAuditLogProjection,
      AccountSecurityScoreProjection,
      ThreatDetectionMetricsProjection,
      AuditProjectionRebuildService,

      // Repositories
      {
         provide: ACCOUNT_REPOSITORY,
         useClass: AccountRepository,
      },
      AccountRepository,
      {
         provide: RBAC_REPOSITORY,
         useClass: RbacRepository,
      },
      RbacRepository,
      {
         provide: SESSION_REPOSITORY,
         useClass: SessionRepository,
      },
      SessionRepository,
      {
         provide: AUDIT_LOG_REPOSITORY,
         useClass: AuditLogRepository,
      },
      AuditLogRepository,
   ],
   exports: [
      AuthCoreService,
      AuthRegistrationService,
      SessionManagementService,
      PasswordManagementService,
      JWT_SERVICE,
      JwtService,
      PASSWORD_HASHER,
      PasswordHasherService,
      VERIFICATION_TOKEN_SERVICE,
      VerificationTokenService,
      TOKEN_LIFECYCLE_SERVICE,
      TokenLifecycleService,
      AUTH_RATE_LIMITER,
      AuthRateLimiter,
      AUTH_METRICS_SERVICE,
      AuthMetricsService,
      AuditLogService,
      EmailBloomFilterService,
      ACCOUNT_REPOSITORY,
      AccountRepository,
      RBAC_REPOSITORY,
      RbacRepository,
      SESSION_REPOSITORY,
      SessionRepository,
      AUDIT_LOG_REPOSITORY,
      AuditLogRepository,
      AUDIT_EVENT_STORE,
      AuditEventStore,
      SecurityAuditLogProjection,
      AccountSecurityScoreProjection,
      ThreatDetectionMetricsProjection,
      AuditProjectionRebuildService,
      OutboxModule,
      UserRegisteredEventHandler,
      AccountLockedEventHandler,
      PasswordChangedEventHandler,
      SessionRevokedEventHandler,
   ],
})
export class AuthModule {}
