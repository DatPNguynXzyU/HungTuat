import { Module } from '@nestjs/common';
import { LoggerModule, RedisModule, RmqModule } from '@common';
import { AuthController } from '@auth/auth.controller';
import { AuthService } from '@auth/auth.service';
import { AuthConfigModule } from '@auth/config';
import { PrismaModule } from '@auth/prisma';
import { AUTH_REPOSITORY, AuthRepository } from '@auth/repositories';
import { TokenService } from '@auth/services/token.service';

@Module({
   imports: [AuthConfigModule, LoggerModule, RedisModule, RmqModule, PrismaModule],
   controllers: [AuthController],
   providers: [
      TokenService,
      AuthService,
      {
         provide: AUTH_REPOSITORY,
         useClass: AuthRepository,
      },
      AuthRepository,
   ],
   exports: [AuthService, TokenService, AUTH_REPOSITORY, AuthRepository],
})
export class AuthModule {}
