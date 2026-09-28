import { Module } from '@nestjs/common';
import { LoggerModule, RedisModule, RmqModule, SERVICES } from '@common';
import { AuthController } from '@auth/auth.controller';
import { AuthService } from '@auth/auth.service';
import { AuthConfigModule } from '@auth/config';
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
import { AuditLogService } from '@auth/services/audit-log.service';
import { TokenService } from '@auth/services/token.service';

@Module({
   imports: [
      AuthConfigModule,
      LoggerModule,
      PrismaModule,
      RedisModule,
      OutboxModule,
      RmqModule.register({
         name: SERVICES.NOTIFICATION_SERVICE,
      }),
   ],
   controllers: [AuthController],
   providers: [
      AuthService,
      TokenService,
      AuditLogService,
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
      AuthService,
      TokenService,
      AuditLogService,
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
