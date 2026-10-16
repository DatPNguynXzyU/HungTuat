import { BadRequestException } from '@common';
import { PROFILE_OPERATION_TYPES, type ProfileOperationType } from '@user/constants';
import { ProfileOperationFactory } from '@user/factories/profile-operation.factory';
import {
   CreateProfileOperation,
   UpdateProfileOperation,
   UpdateUsernameOperation,
   DeleteProfileOperation,
   RestoreProfileOperation,
} from '@user/templates';
import type { IUserProfileRepository } from '@user/repositories';
import type { ProfileQueryService } from '@user/services/domain/profile-query.service';
import type { ProfileSyncService } from '@user/services/infrastructure/profile-sync.service';
import type { ProfileValidationPipeline } from '@user/chains/profile-validation';

describe('ProfileOperationFactory', () => {
   let factory: ProfileOperationFactory;
   let mockRepo: jest.Mocked<IUserProfileRepository>;
   let mockQueryService: jest.Mocked<ProfileQueryService>;
   let mockSyncService: jest.Mocked<ProfileSyncService>;
   let mockPipeline: jest.Mocked<ProfileValidationPipeline>;

   beforeEach(() => {
      mockRepo = {} as jest.Mocked<IUserProfileRepository>;
      mockQueryService = {} as jest.Mocked<ProfileQueryService>;
      mockSyncService = {} as jest.Mocked<ProfileSyncService>;
      mockPipeline = {} as jest.Mocked<ProfileValidationPipeline>;

      factory = new ProfileOperationFactory(mockRepo, mockQueryService, mockSyncService, mockPipeline);
   });

   it('should instantiate CreateProfileOperation', () => {
      const op = factory.createCreateProfileOperation();
      expect(op).toBeInstanceOf(CreateProfileOperation);
   });

   it('should instantiate UpdateProfileOperation', () => {
      const op = factory.createUpdateProfileOperation();
      expect(op).toBeInstanceOf(UpdateProfileOperation);
   });

   it('should instantiate UpdateUsernameOperation', () => {
      const op = factory.createUpdateUsernameOperation();
      expect(op).toBeInstanceOf(UpdateUsernameOperation);
   });

   it('should instantiate DeleteProfileOperation', () => {
      const op = factory.createDeleteProfileOperation();
      expect(op).toBeInstanceOf(DeleteProfileOperation);
   });

   it('should instantiate RestoreProfileOperation', () => {
      const op = factory.createRestoreProfileOperation();
      expect(op).toBeInstanceOf(RestoreProfileOperation);
   });

   it('should create operation dynamically by type', () => {
      expect(factory.createOperation(PROFILE_OPERATION_TYPES.CREATE_PROFILE)).toBeInstanceOf(CreateProfileOperation);
      expect(factory.createOperation(PROFILE_OPERATION_TYPES.UPDATE_PROFILE)).toBeInstanceOf(UpdateProfileOperation);
      expect(factory.createOperation(PROFILE_OPERATION_TYPES.UPDATE_USERNAME)).toBeInstanceOf(UpdateUsernameOperation);
      expect(factory.createOperation(PROFILE_OPERATION_TYPES.DELETE_PROFILE)).toBeInstanceOf(DeleteProfileOperation);
      expect(factory.createOperation(PROFILE_OPERATION_TYPES.RESTORE_PROFILE)).toBeInstanceOf(RestoreProfileOperation);
   });

   it('should throw BadRequestException when given invalid operation type', () => {
      expect(() => factory.createOperation('INVALID_TYPE' as ProfileOperationType)).toThrow(BadRequestException);
   });
});
