import { Module, type OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppLogger, COMMAND_BUS, CommandBus, NebulaModule, RedisModule, type ICommandHandler } from '@common';
import { UserConfigModule } from '@user/config';
import { UserLoggerModule } from '@user/logger';
import { PrismaModule } from '@user/prisma';
import { OutboxModule } from '@user/outbox';
import { UnitOfWorkModule, UNIT_OF_WORK, PrismaUnitOfWork } from '@user/unit-of-work';
import { UserAdaptersModule } from '@user/adapters';
import { UserDomainModule } from '@user/domain';
import {
   UserFactoriesModule,
   FOLLOW_SAGA_FACTORY,
   FollowSagaFactory,
   PROFILE_VALIDATION_PIPELINE_FACTORY,
   ProfileValidationPipelineFactory,
} from '@user/factories';
import { UserCqrsModule } from '@user/cqrs';
import { USER_COMMAND_HANDLERS, UserCommandsModule } from '@user/commands';
import { UserController } from '@user/user.controller';
import { UserMetricsController } from '@user/user-metrics.controller';
import {
   UserCoreService,
   ProfileService,
   FollowService,
   AuthService,
   UserSearchService,
   ProfileLifecycleService,
   ProfileQueryService,
   ProfileAvatarService,
} from '@user/services/domain';
import {
   ProfileValidationPipeline,
   ProfileIdentityHandler,
   UsernameFormatHandler,
   ProfileDetailsFormatHandler,
   UsernameAvailabilityHandler,
} from '@user/chains/profile-validation';
import { FollowUserSaga, UnfollowUserSaga, AcceptFollowRequestSaga, RejectFollowRequestSaga } from '@user/sagas/follow';
import {
   UsernameBloomFilterService,
   UserResolverService,
   ProfileSyncService,
   UserGraphSyncService,
   UserMetricsService,
   USER_METRICS_SERVICE,
   type IUserMetricsService,
   USER_GRAPH_SYNC_SERVICE,
} from '@user/services/infrastructure';
import { MetricsUserGraphSyncDecorator } from '@user/decorators';
import { GraphSchemaService } from '@user/graph';
import {
   UserProfileRepository,
   USER_PROFILE_REPOSITORY,
   USER_REPOSITORY,
   FollowRepository,
   FOLLOW_REPOSITORY,
   FollowGraphRepository,
   GRAPH_FOLLOW_REPOSITORY,
} from '@user/repositories';

@Module({
   imports: [
      EventEmitterModule.forRoot({
         wildcard: true,
         delimiter: '.',
         maxListeners: 20,
      }),

      // Configuration & Core Infrastructure Modules
      UserConfigModule,
      UserLoggerModule,
      PrismaModule,
      RedisModule,
      OutboxModule,
      UnitOfWorkModule,
      NebulaModule.forRoot(),

      // Domain & Feature Architecture Modules
      UserAdaptersModule,
      UserDomainModule,
      UserFactoriesModule,
      UserCqrsModule,
      UserCommandsModule,
   ],
   controllers: [UserController, UserMetricsController],
   providers: [
      // Domain Services
      UserCoreService,
      ProfileService,
      FollowService,
      AuthService,
      UserSearchService,
      ProfileLifecycleService,
      ProfileQueryService,
      ProfileAvatarService,

      // Chain of Responsibility Pipeline & Handlers
      ProfileValidationPipeline,
      ProfileIdentityHandler,
      UsernameFormatHandler,
      ProfileDetailsFormatHandler,
      UsernameAvailabilityHandler,

      // Sagas
      FollowUserSaga,
      UnfollowUserSaga,
      AcceptFollowRequestSaga,
      RejectFollowRequestSaga,

      // Factory Providers
      {
         provide: FOLLOW_SAGA_FACTORY,
         useClass: FollowSagaFactory,
      },
      {
         provide: PROFILE_VALIDATION_PIPELINE_FACTORY,
         useClass: ProfileValidationPipelineFactory,
      },

      // Infrastructure Services
      UsernameBloomFilterService,
      UserResolverService,
      ProfileSyncService,
      UserGraphSyncService,
      GraphSchemaService,
      UserMetricsService,
      {
         provide: USER_METRICS_SERVICE,
         useExisting: UserMetricsService,
      },
      MetricsUserGraphSyncDecorator,
      {
         provide: USER_GRAPH_SYNC_SERVICE,
         useFactory: (inner: UserGraphSyncService, metrics: IUserMetricsService, logger: AppLogger) =>
            new MetricsUserGraphSyncDecorator(inner, metrics, logger),
         inject: [UserGraphSyncService, USER_METRICS_SERVICE, AppLogger],
      },

      // Repositories
      UserProfileRepository,
      {
         provide: USER_PROFILE_REPOSITORY,
         useClass: UserProfileRepository,
      },
      {
         provide: USER_REPOSITORY,
         useExisting: USER_PROFILE_REPOSITORY,
      },
      FollowRepository,
      {
         provide: FOLLOW_REPOSITORY,
         useClass: FollowRepository,
      },
      FollowGraphRepository,
      {
         provide: GRAPH_FOLLOW_REPOSITORY,
         useClass: FollowGraphRepository,
      },
   ],
   exports: [
      UserCoreService,
      ProfileService,
      FollowService,
      AuthService,
      UserSearchService,
      ProfileLifecycleService,
      ProfileQueryService,
      ProfileAvatarService,
      UserController,
      UserMetricsController,
      UserDomainModule,
      UserFactoriesModule,
      UserAdaptersModule,
      UserCommandsModule,
      UserCqrsModule,
      UserResolverService,
      ProfileSyncService,
      UsernameBloomFilterService,
      UserGraphSyncService,
      MetricsUserGraphSyncDecorator,
      USER_GRAPH_SYNC_SERVICE,
      USER_METRICS_SERVICE,
      UserMetricsService,
      USER_PROFILE_REPOSITORY,
      UserProfileRepository,
      USER_REPOSITORY,
      FOLLOW_REPOSITORY,
      FollowRepository,
      GRAPH_FOLLOW_REPOSITORY,
      FollowGraphRepository,
      UnitOfWorkModule,
      UNIT_OF_WORK,
      PrismaUnitOfWork,
      COMMAND_BUS,
      CommandBus,
      ...USER_COMMAND_HANDLERS,
   ],
})
export class UserModule implements OnModuleInit {
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
