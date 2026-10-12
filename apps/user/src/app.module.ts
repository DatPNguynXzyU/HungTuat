import { Module } from '@nestjs/common';
import { RedisModule, RmqModule, SERVICES, NebulaModule, CloudinaryModule } from '@common';
import { UserConfigModule, UserLoggerModule, PrismaModule, OutboxModule } from '@user/core';
import { ProfileModule } from '@user/modules/profile';
import { FollowModule } from '@user/modules/follow';
import { SearchModule } from '@user/modules/search';
import { AuthenticationModule } from '@user/modules/authentication';
import { UserService } from '@user/user.service';
import { USER_REPOSITORY, UserRepository, FOLLOW_REPOSITORY, FollowRepository } from '@user/repositories';
import { GraphSchemaService, GraphFollowRepository } from '@user/graph';
import { UserGraphSyncService, UsernameBloomFilterService } from '@user/services';

@Module({
   imports: [
      // Core
      UserConfigModule,
      UserLoggerModule,
      PrismaModule,
      RedisModule,
      OutboxModule,

      // External
      NebulaModule.forRoot(),
      CloudinaryModule.forRoot(),
      RmqModule.register({
         name: SERVICES.NOTIFICATION_SERVICE,
      }),
      RmqModule.register({
         name: SERVICES.AUTH_SERVICE,
      }),
      RmqModule.register({
         name: SERVICES.SEARCH_SERVICE,
      }),

      // Feature Modules
      ProfileModule,
      FollowModule,
      SearchModule,
      AuthenticationModule,
   ],
   providers: [
      UserService,
      UsernameBloomFilterService,
      {
         provide: USER_REPOSITORY,
         useClass: UserRepository,
      },
      UserRepository,
      {
         provide: FOLLOW_REPOSITORY,
         useClass: FollowRepository,
      },
      FollowRepository,
      GraphSchemaService,
      GraphFollowRepository,
      UserGraphSyncService,
   ],
   exports: [
      ProfileModule,
      FollowModule,
      SearchModule,
      AuthenticationModule,
      UserService,
      USER_REPOSITORY,
      UserRepository,
      FOLLOW_REPOSITORY,
      FollowRepository,
   ],
})
export class AppModule {}

// Backward compatibility export
export { AppModule as UserModule };
