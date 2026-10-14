import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { CustomThrottlerGuard, JwtAuthGuard, RedisModule, RmqModule, SERVICES } from '@common';
import { GatewayConfigModule, GatewayConfigService } from '@/config';
import { GatewayLoggerModule } from '@/logger';
import { AuditLogsModule } from '@/modules/audit-logs/audit-logs.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { HealthModule } from '@/modules/health/health.module';
import { UsersModule } from '@/modules/users/users.module';
import { MediaModule } from '@/modules/media/media.module';

@Module({
   imports: [
      GatewayConfigModule,
      GatewayLoggerModule,
      RedisModule,
      RmqModule.register({
         name: SERVICES.AUTH_SERVICE,
      }),
      ThrottlerModule.forRootAsync({
         imports: [GatewayConfigModule],
         inject: [GatewayConfigService],
         useFactory: (config: GatewayConfigService) => [
            {
               name: 'short',
               ttl: config.throttle.shortTtl,
               limit: config.throttle.shortLimit,
            },
            {
               name: 'medium',
               ttl: config.throttle.mediumTtl,
               limit: config.throttle.mediumLimit,
            },
            {
               name: 'long',
               ttl: config.throttle.longTtl,
               limit: config.throttle.longLimit,
            },
         ],
      }),
      HealthModule,
      AuthModule,
      UsersModule,
      AuditLogsModule,
      MediaModule,
   ],
   controllers: [],
   providers: [
      {
         provide: APP_GUARD,
         useClass: CustomThrottlerGuard,
      },
      {
         provide: APP_GUARD,
         useClass: JwtAuthGuard,
      },
   ],
})
export class GatewayModule {}
