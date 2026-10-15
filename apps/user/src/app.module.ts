import { Module, type OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppLogger, COMMAND_BUS, CommandBus, RedisModule, NebulaModule, type ICommandHandler } from '@common';
import { UserConfigModule, UserLoggerModule, PrismaModule, OutboxModule, UserMetricsModule } from '@user/core';
import { UserDomainModule } from '@user/domain';
import { UserAdaptersModule } from '@user/adapters';
import { UnitOfWorkModule, UNIT_OF_WORK, PrismaUnitOfWork } from '@user/unit-of-work';
import { ProfileModule } from '@user/modules/profile';
import { FollowModule } from '@user/modules/follow';
import { SearchModule } from '@user/modules/search';
import { AuthenticationModule } from '@user/modules/authentication';
import { USER_REPOSITORY, UserRepository, USER_PROFILE_REPOSITORY, UserProfileRepository } from '@user/modules/profile';
import { FOLLOW_REPOSITORY, FollowRepository } from '@user/modules/follow';
import {
   UsernameBloomFilterService,
   UserGraphSyncService,
   UserResolverService,
   USER_GRAPH_SYNC_SERVICE,
   USER_METRICS_SERVICE,
   type IUserMetricsService,
} from '@user/services/infrastructure';
import { MetricsUserGraphSyncDecorator } from '@user/decorators';
import { GraphSchemaService, GraphFollowRepository } from '@user/graph';
import { USER_COMMAND_HANDLERS, UserCommandsModule } from '@user/commands';
import { UserCoreService } from '@user/services/domain';
import { UserController } from '@user/user.controller';
import { UserMetricsController } from '@user/user-metrics.controller';
import { UserCqrsModule } from '@user/cqrs';
import { UserFactoriesModule } from '@user/factories';

@Module({
   imports: [
      EventEmitterModule.forRoot({
         wildcard: true,
         delimiter: '.',
         maxListeners: 20,
      }),

      // Domain Layer
      UserDomainModule,
      UserFactoriesModule,

      // Core
      UserConfigModule,
      UserLoggerModule,
      UserMetricsModule,
      PrismaModule,
      RedisModule,
      OutboxModule,
      UnitOfWorkModule,

      // External
      NebulaModule.forRoot(),
      UserAdaptersModule,

      // Feature Modules
      ProfileModule,
      FollowModule,
      SearchModule,
      AuthenticationModule,

      // CQRS Commands & Event Store
      UserCommandsModule,
      UserCqrsModule,
   ],
   controllers: [UserController, UserMetricsController],
   providers: [
      UserCoreService,
      UsernameBloomFilterService,
      UserResolverService,
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
      MetricsUserGraphSyncDecorator,
      {
         provide: USER_GRAPH_SYNC_SERVICE,
         useFactory: (inner: UserGraphSyncService, metrics: IUserMetricsService, logger: AppLogger) =>
            new MetricsUserGraphSyncDecorator(inner, metrics, logger),
         inject: [UserGraphSyncService, USER_METRICS_SERVICE, AppLogger],
      },
   ],
   exports: [
      UserCoreService,
      UserController,
      UserMetricsController,
      UserDomainModule,
      UserFactoriesModule,
      UserAdaptersModule,
      ProfileModule,
      FollowModule,
      SearchModule,
      AuthenticationModule,
      UserCommandsModule,
      UserCqrsModule,
      UserResolverService,
      USER_PROFILE_REPOSITORY,
      UserProfileRepository,
      USER_REPOSITORY,
      UserRepository,
      FOLLOW_REPOSITORY,
      FollowRepository,
      UserGraphSyncService,
      MetricsUserGraphSyncDecorator,
      USER_GRAPH_SYNC_SERVICE,
      UnitOfWorkModule,
      UNIT_OF_WORK,
      PrismaUnitOfWork,
      COMMAND_BUS,
      CommandBus,
      ...USER_COMMAND_HANDLERS,
   ],
})
export class AppModule implements OnModuleInit {
   constructor(
      private readonly commandBus: CommandBus,
      private readonly moduleRef: ModuleRef,
   ) {}

   onModuleInit(): void {
      for (const handlerClass of USER_COMMAND_HANDLERS) {
         const handler = this.moduleRef.get<ICommandHandler<never, never>>(handlerClass, { strict: false });
         if (handler) {
            this.commandBus.registerHandler(handler);
         }
      }
   }
}

// Backward compatibility export
export { AppModule as UserModule };
