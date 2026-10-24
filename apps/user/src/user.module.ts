import { Module, type OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import {
   AppLogger,
   CommandBus,
   DatabaseHealthIndicator,
   GRPC_METRICS_COLLECTOR,
   GrpcHealthModule,
   GrpcLoggingInterceptor,
   GrpcMetricsInterceptor,
   HEALTH_INDICATOR_NAMES,
   RedisHealthIndicator,
   RedisModule,
   RedisService,
   RmqModule,
   type ICommandHandler,
} from '@common';
import { NebulaModule } from '@user/infrastructure/nebula';
import { UserConfigModule } from '@user/config';
import { UserLoggerModule } from '@user/logger';
import { PrismaModule, PrismaService } from '@user/prisma';
import { OutboxModule } from '@user/outbox';
import { UnitOfWorkModule } from '@user/unit-of-work';
import { UserAdaptersModule } from '@user/adapters';
import { UserDomainModule } from '@user/domain';
import {
   UserFactoriesModule,
   FOLLOW_SAGA_FACTORY,
   FollowSagaFactory,
   PROFILE_VALIDATION_PIPELINE_FACTORY,
   ProfileValidationPipelineFactory,
   FOLLOW_VALIDATION_PIPELINE_FACTORY,
   FollowValidationPipelineFactory,
   PROFILE_OPERATION_FACTORY,
   ProfileOperationFactory,
} from '@user/factories';
import {
   CreateProfileOperation,
   UpdateProfileOperation,
   UpdateUsernameOperation,
   DeleteProfileOperation,
   RestoreProfileOperation,
} from '@user/templates';
import { UserCqrsModule } from '@user/cqrs';
import { USER_COMMAND_HANDLERS, UserCommandsModule } from '@user/commands';
import { UserController } from '@user/user.controller';
import { UserMetricsController } from '@user/user-metrics.controller';
import { UserGrpcController } from '@user/adapters/grpc';
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
import {
   FollowValidationPipeline,
   FollowSelfValidationHandler,
   FollowUserResolutionHandler,
   FollowRelationshipHandler,
   FollowRequestStatusHandler,
} from '@user/chains/follow-validation';
import { FollowUserSaga, UnfollowUserSaga, AcceptFollowRequestSaga, RejectFollowRequestSaga } from '@user/sagas/follow';
import {
   UsernameBloomFilterService,
   UserResolverService,
   ProfileSyncService,
   UserGraphSyncService,
   USER_METRICS_SERVICE,
   type IUserMetricsService,
   USER_GRAPH_SYNC_SERVICE,
} from '@user/services/infrastructure';
import { MetricsUserGraphSyncDecorator } from '@user/decorators';
import { GraphSchemaService } from '@user/graph';
import {
   UserProfileRepository,
   USER_PROFILE_REPOSITORY,
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
      GrpcHealthModule.registerAsync({
         imports: [PrismaModule, RedisModule],
         inject: [PrismaService, RedisService],
         useFactory: (prisma: PrismaService, redisService: RedisService) => [
            DatabaseHealthIndicator.fromPrisma(prisma, HEALTH_INDICATOR_NAMES.DATABASE),
            new RedisHealthIndicator(redisService, HEALTH_INDICATOR_NAMES.REDIS),
         ],
      }),
      OutboxModule,
      UnitOfWorkModule,
      NebulaModule.forRoot({ space: 'social_graph' }),
      RmqModule,

      // Domain & Feature Architecture Modules
      UserAdaptersModule,
      UserDomainModule,
      UserFactoriesModule,
      UserCqrsModule,
      UserCommandsModule,
   ],
   controllers: [UserController, UserMetricsController, UserGrpcController],
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
      FollowValidationPipeline,
      FollowSelfValidationHandler,
      FollowUserResolutionHandler,
      FollowRelationshipHandler,
      FollowRequestStatusHandler,

      // Sagas
      FollowUserSaga,
      UnfollowUserSaga,
      AcceptFollowRequestSaga,
      RejectFollowRequestSaga,

      // Profile Operations (Template Method Pattern)
      CreateProfileOperation,
      UpdateProfileOperation,
      UpdateUsernameOperation,
      DeleteProfileOperation,
      RestoreProfileOperation,

      // Factory Providers
      {
         provide: FOLLOW_SAGA_FACTORY,
         useClass: FollowSagaFactory,
      },
      {
         provide: PROFILE_VALIDATION_PIPELINE_FACTORY,
         useClass: ProfileValidationPipelineFactory,
      },
      {
         provide: FOLLOW_VALIDATION_PIPELINE_FACTORY,
         useClass: FollowValidationPipelineFactory,
      },
      {
         provide: PROFILE_OPERATION_FACTORY,
         useClass: ProfileOperationFactory,
      },
      ProfileOperationFactory,

      // Infrastructure Services
      GrpcLoggingInterceptor,
      GrpcMetricsInterceptor,
      {
         provide: GRPC_METRICS_COLLECTOR,
         useExisting: USER_METRICS_SERVICE,
      },
      UsernameBloomFilterService,
      UserResolverService,
      ProfileSyncService,
      UserGraphSyncService,
      GraphSchemaService,
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
      UserDomainModule,
      UserFactoriesModule,
      UserAdaptersModule,
      UserCommandsModule,
      UserCqrsModule,
      CreateProfileOperation,
      UpdateProfileOperation,
      UpdateUsernameOperation,
      DeleteProfileOperation,
      RestoreProfileOperation,
      ProfileOperationFactory,
      PROFILE_OPERATION_FACTORY,
      UserResolverService,
      ProfileSyncService,
      UsernameBloomFilterService,
      UserGraphSyncService,
      USER_GRAPH_SYNC_SERVICE,
      USER_PROFILE_REPOSITORY,
      UserProfileRepository,
      FOLLOW_REPOSITORY,
      FollowRepository,
      GRAPH_FOLLOW_REPOSITORY,
      FollowGraphRepository,
      UnitOfWorkModule,
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
