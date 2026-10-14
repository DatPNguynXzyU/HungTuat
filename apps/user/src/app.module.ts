import { Module } from '@nestjs/common';
import { RedisModule, RmqModule, SERVICES, NebulaModule, CloudinaryModule } from '@common';
import { UserConfigModule, UserLoggerModule, PrismaModule, OutboxModule } from '@user/core';
import { ProfileModule } from '@user/modules/profile';
import { FollowModule } from '@user/modules/follow';
import { SearchModule } from '@user/modules/search';
import { AuthenticationModule } from '@user/modules/authentication';
import { USER_REPOSITORY, UserRepository, USER_PROFILE_REPOSITORY, UserProfileRepository } from '@user/modules/profile';
import { FOLLOW_REPOSITORY, FollowRepository, UserGraphSyncService } from '@user/modules/follow';
import { UsernameBloomFilterService } from '@user/modules/authentication';
import { GraphSchemaService, GraphFollowRepository } from '@user/graph';

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
      UsernameBloomFilterService,
      {
         provide: USER_PROFILE_REPOSITORY,
         useClass: UserProfileRepository,
      },
      {
         provide: USER_REPOSITORY,
         useClass: UserRepository,
      },
      UserProfileRepository,
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
      USER_PROFILE_REPOSITORY,
      UserProfileRepository,
      USER_REPOSITORY,
      UserRepository,
      FOLLOW_REPOSITORY,
      FollowRepository,
   ],
})
export class AppModule {}

// Backward compatibility export
export { AppModule as UserModule };
