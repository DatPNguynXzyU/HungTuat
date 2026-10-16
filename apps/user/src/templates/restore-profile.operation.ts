import { Inject, Injectable } from '@nestjs/common';
import { PROFILE_OPERATIONS, PROFILE_OPERATION_NAMES, type ProfileOperationName } from '@user/constants';
import type { UserEntity } from '@user/entities';
import { USER_PROFILE_REPOSITORY, type IUserProfileRepository } from '@user/repositories';
import { ProfileSyncService } from '@user/services/infrastructure/profile-sync.service';
import { AbstractProfileOperation } from '@user/templates/abstract-profile.operation';
import type { RestoreProfileContext, RestoreProfileParams } from '@user/templates/profile-operation.interface';

/**
 * Concrete Template Method implementation for User Profile Restoration.
 */
@Injectable()
export class RestoreProfileOperation extends AbstractProfileOperation<
   RestoreProfileParams,
   RestoreProfileContext,
   UserEntity
> {
   constructor(
      @Inject(USER_PROFILE_REPOSITORY)
      private readonly userProfileRepository: IUserProfileRepository,
      private readonly profileSyncService: ProfileSyncService,
   ) {
      super();
   }

   protected getOperationName(): ProfileOperationName {
      return PROFILE_OPERATION_NAMES.RESTORE_PROFILE;
   }

   protected createContext(params: RestoreProfileParams): RestoreProfileContext {
      return {
         operation: PROFILE_OPERATIONS.UPDATE,
         startTime: Date.now(),
         userId: params.userId,
         options: params.options,
      };
   }

   protected async performOperation(context: RestoreProfileContext): Promise<UserEntity> {
      const restoredUser = await this.userProfileRepository.restore(context.userId);
      context.restoredUser = restoredUser;
      return restoredUser;
   }

   protected async syncInfrastructure(_context: RestoreProfileContext, result: UserEntity): Promise<void> {
      await this.profileSyncService.syncUserRestored(result);
   }
}
