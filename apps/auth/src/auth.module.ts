import { Module } from '@nestjs/common';
import { RedisModule, RmqModule, SERVICES } from '@common';
import { AuthController } from '@auth/auth.controller';
import { AuthService } from '@auth/auth.service';
import { AuthConfigModule } from '@auth/config';
import { AuthLoggerModule } from '@auth/logger';
import { OutboxModule } from '@auth/outbox';
import { PrismaModule } from '@auth/prisma';
import {
   AUDIT_LOG_REPOSITORY,
   AuditLogRepository,
   AUTH_REPOSITORY,
   AuthRepository,
   SESSION_REPOSITORY,
   SessionRepository,
} from '@auth/repositories';
import { TokenService, TOKEN_SERVICE, AuditLogService, EmailBloomFilterService } from '@auth/services/infrastructure';
import {
   AuthCoreService,
   AuthRegistrationService,
   SessionManagementService,
   PasswordManagementService,
} from '@auth/services/domain';

@Module({
   imports: [
      AuthConfigModule,
      AuthLoggerModule,
      PrismaModule,
      RedisModule,
      OutboxModule,
      RmqModule.register({
         name: SERVICES.NOTIFICATION_SERVICE,
      }),
   ],
   controllers: [AuthController],
   providers: [
      // Domain Services
      AuthCoreService,
      AuthRegistrationService,
      SessionManagementService,
      PasswordManagementService,
      AuthService,

      // Infrastructure Services
      {
         provide: TOKEN_SERVICE,
         useClass: TokenService,
      },
      TokenService,
      AuditLogService,
      EmailBloomFilterService,

      // Repositories
      {
         provide: AUTH_REPOSITORY,
         useClass: AuthRepository,
      },
      AuthRepository,
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
      AuthService,
      TOKEN_SERVICE,
      TokenService,
      AuditLogService,
      EmailBloomFilterService,
      AUTH_REPOSITORY,
      AuthRepository,
      SESSION_REPOSITORY,
      SessionRepository,
      AUDIT_LOG_REPOSITORY,
      AuditLogRepository,
      OutboxModule,
   ],
})
export class AuthModule {}
