import { Module } from '@nestjs/common';
import { LoggerModule, RedisModule, RmqModule, SERVICES } from '@common';
import { AuthController } from '@auth/auth.controller';
import { AuthService } from '@auth/auth.service';
import { AuthConfigModule } from '@auth/config';
import { OutboxModule } from '@auth/outbox';
import { PrismaModule } from '@auth/prisma';
import { AUTH_REPOSITORY, AuthRepository } from '@auth/repositories';
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
      {
         provide: AUTH_REPOSITORY,
         useClass: AuthRepository,
      },
      AuthRepository,
   ],
   exports: [AuthService, TokenService, AUTH_REPOSITORY, AuthRepository, OutboxModule],
})
export class AuthModule {}
