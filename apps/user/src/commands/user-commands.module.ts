import { Global, Module, type OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { AppLogger, COMMAND_BUS, CommandBus, RedisModule, type ICommandHandler } from '@common';
import { NebulaModule } from '@user/infrastructure/nebula';
import { PrismaModule } from '@user/prisma';
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
} from '@user/factories';
import { USER_COMMAND_HANDLERS } from '@user/commands';
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
import {
   UserProfileRepository,
   USER_PROFILE_REPOSITORY,
   FollowRepository,
   FOLLOW_REPOSITORY,
   FollowGraphRepository,
   GRAPH_FOLLOW_REPOSITORY,
} from '@user/repositories';

@Global()
@Module({
   imports: [
      PrismaModule,
      OutboxModule,
      UnitOfWorkModule,
      UserAdaptersModule,
      UserDomainModule,
      UserFactoriesModule,
      RedisModule,
      NebulaModule.forRoot(),
   ],
   providers: [
      CommandBus,
      {
         provide: COMMAND_BUS,
         useExisting: CommandBus,
      },
      ...USER_COMMAND_HANDLERS,

      // Domain Services
      UserCoreService,
      ProfileService,
      FollowService,
      AuthService,
      UserSearchService,
      ProfileLifecycleService,
      ProfileQueryService,
      ProfileAvatarService,

      // Chain of Responsibility Handlers & Pipeline
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

      // Infrastructure Services
      UsernameBloomFilterService,
      UserResolverService,
      ProfileSyncService,
      UserGraphSyncService,
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
      CommandBus,
      COMMAND_BUS,
      ...USER_COMMAND_HANDLERS,
      UserCoreService,
      ProfileService,
      FollowService,
      AuthService,
      UserSearchService,
      ProfileLifecycleService,
      ProfileQueryService,
      ProfileAvatarService,
      USER_PROFILE_REPOSITORY,
      FOLLOW_REPOSITORY,
      GRAPH_FOLLOW_REPOSITORY,
   ],
})
export class UserCommandsModule implements OnModuleInit {
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
