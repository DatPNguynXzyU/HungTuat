import { Module } from '@nestjs/common';
import { RedisModule, RmqModule, SERVICES, NebulaModule, CloudinaryModule } from '@common';
import { UserController } from '@user/user.controller';
import { UserService } from '@user/user.service';
import { UserConfigModule } from '@user/config';
import { OutboxModule } from '@user/outbox';
import { PrismaModule } from '@user/prisma';
import { USER_REPOSITORY, UserRepository, FOLLOW_REPOSITORY, FollowRepository } from '@user/repositories';
import { GraphSchemaService, GraphFollowRepository } from '@user/graph';
import { UserGraphSyncService, UsernameBloomFilterService } from '@user/services';
import { UserLoggerModule } from '@user/logger';

@Module({
   imports: [
      UserConfigModule,
      UserLoggerModule,
      PrismaModule,
      RedisModule,
      OutboxModule,
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
   ],
   controllers: [UserController],
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
      UserService,
      UsernameBloomFilterService,
      USER_REPOSITORY,
      UserRepository,
      FOLLOW_REPOSITORY,
      FollowRepository,
      GraphFollowRepository,
   ],
})
export class UserModule {}
