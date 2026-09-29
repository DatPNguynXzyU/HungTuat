import { Module } from '@nestjs/common';
import { LoggerModule, RedisModule, RmqModule, SERVICES, NebulaModule } from '@common';
import { UserController } from '@user/user.controller';
import { UserService } from '@user/user.service';
import { UserConfigModule } from '@user/config';
import { OutboxModule } from '@user/outbox';
import { PrismaModule } from '@user/prisma';
import { USER_REPOSITORY, UserRepository, FOLLOW_REPOSITORY, FollowRepository } from '@user/repositories';
import { GraphSchemaService, GraphFollowRepository } from '@user/graph';
import { UserGraphSyncService } from '@user/services';

@Module({
   imports: [
      UserConfigModule,
      LoggerModule,
      PrismaModule,
      RedisModule,
      OutboxModule,
      NebulaModule.forRoot(),
      RmqModule.register({
         name: SERVICES.NOTIFICATION_SERVICE,
      }),
      RmqModule.register({
         name: SERVICES.AUTH_SERVICE,
      }),
   ],
   controllers: [UserController],
   providers: [
      UserService,
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
   exports: [UserService, USER_REPOSITORY, UserRepository, FOLLOW_REPOSITORY, FollowRepository, GraphFollowRepository],
})
export class UserModule {}
