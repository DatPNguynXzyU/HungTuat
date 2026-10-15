import { Module } from '@nestjs/common';
import { NebulaModule, RedisModule, RetryQueueModule } from '@common';
import { PrismaModule } from '@user/core/database/prisma';
import { OutboxModule } from '@user/core/outbox';
import { UserDomainModule } from '@user/domain';
import { UserAdaptersModule, MEDIA_ADAPTER, SEARCH_ADAPTER } from '@user/adapters';
import {
   UserProfileRepository,
   USER_PROFILE_REPOSITORY,
} from '@user/modules/profile/repositories/user-profile.repository';
import { ProfileService } from '@user/services/domain/profile.service';
import { ProfileController } from '@user/modules/profile/profile.controller';
import { UsernameBloomFilterService } from '@user/services/infrastructure/username-bloom-filter.service';
import { UserGraphSyncService } from '@user/services/infrastructure/user-graph-sync.service';
import { GraphSchemaService, GraphFollowRepository } from '@user/graph';
import { UserResolverService } from '@user/services/infrastructure/user-resolver.service';
import { ProfileQueryService, ProfileSyncService, ProfileLifecycleService, ProfileAvatarService } from '@user/services';
import {
   ProfileValidationPipeline,
   ProfileIdentityHandler,
   UsernameFormatHandler,
   ProfileDetailsFormatHandler,
   UsernameAvailabilityHandler,
} from '@user/chains/profile-validation';
import { PROFILE_VALIDATION_PIPELINE_FACTORY } from '@user/constants';
import { ProfileValidationPipelineFactory, UserFactoriesModule } from '@user/factories';

@Module({
   imports: [
      UserDomainModule,
      UserFactoriesModule,
      UserAdaptersModule,
      PrismaModule,
      OutboxModule,
      RetryQueueModule,
      RedisModule,
      NebulaModule.forRoot(),
   ],
   controllers: [ProfileController],
   providers: [
      // Domain Services
      ProfileService,
      ProfileQueryService,
      ProfileLifecycleService,
      ProfileAvatarService,

      // Chain of Responsibility Pipeline & Handlers
      ProfileValidationPipeline,
      ProfileIdentityHandler,
      UsernameFormatHandler,
      ProfileDetailsFormatHandler,
      UsernameAvailabilityHandler,

      // Factories
      ProfileValidationPipelineFactory,
      {
         provide: PROFILE_VALIDATION_PIPELINE_FACTORY,
         useClass: ProfileValidationPipelineFactory,
      },

      // Infrastructure Services
      ProfileSyncService,
      UserResolverService,
      UsernameBloomFilterService,
      UserGraphSyncService,

      // Repositories
      UserProfileRepository,
      {
         provide: USER_PROFILE_REPOSITORY,
         useClass: UserProfileRepository,
      },
      GraphSchemaService,
      GraphFollowRepository,
   ],
   exports: [
      UserAdaptersModule,
      MEDIA_ADAPTER,
      SEARCH_ADAPTER,
      ProfileService,
      ProfileQueryService,
      ProfileSyncService,
      ProfileLifecycleService,
      ProfileAvatarService,
      ProfileValidationPipeline,
      ProfileIdentityHandler,
      UsernameFormatHandler,
      ProfileDetailsFormatHandler,
      UsernameAvailabilityHandler,
      UserFactoriesModule,
      ProfileValidationPipelineFactory,
      PROFILE_VALIDATION_PIPELINE_FACTORY,
      UserResolverService,
      UserProfileRepository,
      USER_PROFILE_REPOSITORY,
   ],
})
export class ProfileModule {}
