import { HttpStatus, Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { NotFoundException } from '@common';
import { UserEntity } from '@user/entities';
import {
   USER_PROFILE_REPOSITORY,
   type IUserProfileRepository,
   type CreateUserData,
   type UpdateUserData,
} from '@user/repositories';
import { UsernameBloomFilterService } from '@user/services/infrastructure/username-bloom-filter.service';
import { PROFILE_OPERATIONS } from '@user/constants';
import { ProfileQueryService } from '@user/services/domain/profile-query.service';
import { ProfileSyncService } from '@user/services/infrastructure/profile-sync.service';
import { ProfileValidationPipeline } from '@user/chains/profile-validation';
import { PROFILE_VALIDATION_PIPELINE_FACTORY } from '@user/constants';
import { ProfileValidationPipelineFactory, type IProfileValidationPipelineFactory } from '@user/factories';

/**
 * ProfileLifecycleService manages state transitions and lifecycle mutations for user profiles
 * (creation, update, upsert, username modification, deletion, and restoration).
 * All validation logic is orchestrated via the ProfileValidationPipeline Chain of Responsibility.
 */
@Injectable()
export class ProfileLifecycleService {
   private readonly logger = new Logger(ProfileLifecycleService.name);
   private readonly profileValidationPipeline: ProfileValidationPipeline;

   constructor(
      @Inject(USER_PROFILE_REPOSITORY)
      private readonly userProfileRepository: IUserProfileRepository,
      private readonly profileQueryService: ProfileQueryService,
      private readonly usernameBloomFilterService: UsernameBloomFilterService,
      private readonly profileSyncService: ProfileSyncService,
      @Optional()
      profileValidationPipeline?: ProfileValidationPipeline,
      @Optional()
      @Inject(PROFILE_VALIDATION_PIPELINE_FACTORY)
      pipelineFactory?: IProfileValidationPipelineFactory,
   ) {
      const factory =
         pipelineFactory ??
         new ProfileValidationPipelineFactory(
            this.profileQueryService,
            this.usernameBloomFilterService,
            this.userProfileRepository,
         );
      this.profileValidationPipeline = profileValidationPipeline ?? factory.createPipeline();
   }

   async createUser(data: CreateUserData): Promise<UserEntity> {
      await this.profileValidationPipeline.validate({
         operation: PROFILE_OPERATIONS.CREATE,
         accountId: data.accountId,
         username: data.username,
         displayName: data.displayName,
         bio: data.bio,
         avatar: data.avatar,
         coverImage: data.coverImage,
         website: data.website,
         location: data.location,
         dateOfBirth: data.dateOfBirth,
         gender: data.gender,
      });

      const user = await this.userProfileRepository.create(data);
      await this.profileSyncService.syncUserCreated(user);
      return user;
   }

   async updateUserProfile(userId: string, data: UpdateUserData): Promise<UserEntity> {
      const user = await this.profileQueryService.getUserById(userId);

      await this.profileValidationPipeline.validate({
         operation: PROFILE_OPERATIONS.UPDATE,
         userId,
         username: data.username,
         displayName: data.displayName,
         bio: data.bio,
         avatar: data.avatar,
         coverImage: data.coverImage,
         website: data.website,
         location: data.location,
         dateOfBirth: data.dateOfBirth,
         gender: data.gender,
         existingUser: user,
      });

      const updatedUser = await this.userProfileRepository.update(user.userId, data);
      await this.profileSyncService.syncUserUpdated(updatedUser, data, user);
      return updatedUser;
   }

   async upsertUserProfile(userIdOrAccountId: string, data: UpdateUserData): Promise<UserEntity> {
      try {
         return await this.updateUserProfile(userIdOrAccountId, data);
      } catch (err: unknown) {
         const isNotFound =
            err instanceof NotFoundException ||
            (typeof err === 'object' &&
               err !== null &&
               (err as { statusCode?: HttpStatus }).statusCode === HttpStatus.NOT_FOUND);

         if (isNotFound) {
            this.logger.log(`User ${userIdOrAccountId} not found during upsert; creating initial user profile`);
            return await this.createUser({
               accountId: userIdOrAccountId,
               ...data,
            });
         }
         throw err;
      }
   }

   async updateUsername(userId: string, username: string): Promise<UserEntity> {
      const user = await this.profileQueryService.getUserById(userId);

      const normalizedUsername = username.toLowerCase().trim();
      if (normalizedUsername === user.username?.toLowerCase().trim()) {
         return user;
      }

      await this.profileValidationPipeline.validate({
         operation: PROFILE_OPERATIONS.UPDATE,
         userId,
         username,
         existingUser: user,
      });

      const updatedUser = await this.userProfileRepository.update(user.userId, { username });
      await this.profileSyncService.syncUserUpdated(updatedUser, { username: normalizedUsername }, user);
      return updatedUser;
   }

   async deleteUser(userId: string): Promise<UserEntity> {
      const user = await this.profileQueryService.getUserById(userId);
      const deletedUser = await this.userProfileRepository.softDelete(user.userId);
      await this.profileSyncService.syncUserDeleted(user.userId, user.accountId);
      return deletedUser;
   }

   async restoreUser(userId: string): Promise<UserEntity> {
      const restoredUser = await this.userProfileRepository.restore(userId);
      await this.profileSyncService.syncUserRestored(restoredUser);
      return restoredUser;
   }
}
