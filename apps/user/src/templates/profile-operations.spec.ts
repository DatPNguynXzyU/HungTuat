import { PROFILE_OPERATIONS } from '@user/constants';
import { UserEntity, UserStatus } from '@user/entities';
import type { IUserProfileRepository } from '@user/repositories';
import type { ProfileQueryService } from '@user/services/domain/profile-query.service';
import type { ProfileSyncService } from '@user/services/infrastructure/profile-sync.service';
import type { ProfileValidationPipeline } from '@user/chains/profile-validation';
import {
   CreateProfileOperation,
   UpdateProfileOperation,
   UpdateUsernameOperation,
   DeleteProfileOperation,
   RestoreProfileOperation,
} from '@user/templates';

describe('Concrete Profile Operations (Template Method Subclasses)', () => {
   let mockRepo: jest.Mocked<IUserProfileRepository>;
   let mockQueryService: jest.Mocked<ProfileQueryService>;
   let mockSyncService: jest.Mocked<ProfileSyncService>;
   let mockPipeline: jest.Mocked<ProfileValidationPipeline>;

   const mockUser = new UserEntity({
      userId: 'u-1',
      accountId: 'acc-1',
      username: 'johndoe',
      displayName: 'John Doe',
      status: UserStatus.ACTIVE,
   });

   beforeEach(() => {
      mockRepo = {
         create: jest.fn(),
         update: jest.fn(),
         softDelete: jest.fn(),
         restore: jest.fn(),
      } as unknown as jest.Mocked<IUserProfileRepository>;

      mockQueryService = {
         getUserById: jest.fn(),
      } as unknown as jest.Mocked<ProfileQueryService>;

      mockSyncService = {
         syncUserCreated: jest.fn().mockResolvedValue(undefined),
         syncUserUpdated: jest.fn().mockResolvedValue(undefined),
         syncUserDeleted: jest.fn().mockResolvedValue(undefined),
         syncUserRestored: jest.fn().mockResolvedValue(undefined),
      } as unknown as jest.Mocked<ProfileSyncService>;

      mockPipeline = {
         validate: jest.fn().mockResolvedValue(undefined),
      } as unknown as jest.Mocked<ProfileValidationPipeline>;
   });

   describe('CreateProfileOperation', () => {
      it('should validate, create profile in repository, and trigger sync', async () => {
         mockRepo.create.mockResolvedValue(mockUser);
         const op = new CreateProfileOperation(mockRepo, mockSyncService, mockPipeline);

         const result = await op.execute({
            accountId: 'acc-1',
            username: 'johndoe',
            displayName: 'John Doe',
         });

         expect(result).toEqual(mockUser);
         expect(mockPipeline.validate).toHaveBeenCalledWith(
            expect.objectContaining({
               operation: PROFILE_OPERATIONS.CREATE,
               accountId: 'acc-1',
               username: 'johndoe',
            }),
         );
         expect(mockRepo.create).toHaveBeenCalledWith({
            accountId: 'acc-1',
            username: 'johndoe',
            displayName: 'John Doe',
         });
         expect(mockSyncService.syncUserCreated).toHaveBeenCalledWith(mockUser);
      });
   });

   describe('UpdateProfileOperation', () => {
      it('should resolve existing user, validate, update in repository, and sync', async () => {
         const updatedUser = new UserEntity({
            ...mockUser,
            displayName: 'Johnathan Doe',
         });
         mockQueryService.getUserById.mockResolvedValue(mockUser);
         mockRepo.update.mockResolvedValue(updatedUser);

         const op = new UpdateProfileOperation(mockRepo, mockQueryService, mockSyncService, mockPipeline);

         const result = await op.execute({
            userId: 'u-1',
            data: { displayName: 'Johnathan Doe' },
         });

         expect(result).toEqual(updatedUser);
         expect(mockQueryService.getUserById).toHaveBeenCalledWith('u-1');
         expect(mockPipeline.validate).toHaveBeenCalledWith(
            expect.objectContaining({
               operation: PROFILE_OPERATIONS.UPDATE,
               userId: 'u-1',
               displayName: 'Johnathan Doe',
               existingUser: mockUser,
            }),
         );
         expect(mockRepo.update).toHaveBeenCalledWith('u-1', { displayName: 'Johnathan Doe' });
         expect(mockSyncService.syncUserUpdated).toHaveBeenCalledWith(
            updatedUser,
            { displayName: 'Johnathan Doe' },
            mockUser,
         );
      });
   });

   describe('UpdateUsernameOperation', () => {
      it('should short-circuit and return existing user without update if username unchanged', async () => {
         mockQueryService.getUserById.mockResolvedValue(mockUser);

         const op = new UpdateUsernameOperation(mockRepo, mockQueryService, mockSyncService, mockPipeline);

         const result = await op.execute({
            userId: 'u-1',
            username: 'johndoe',
         });

         expect(result).toEqual(mockUser);
         expect(mockRepo.update).not.toHaveBeenCalled();
         expect(mockPipeline.validate).not.toHaveBeenCalled();
         expect(mockSyncService.syncUserUpdated).not.toHaveBeenCalled();
      });

      it('should validate, update username, and trigger sync when username changed', async () => {
         const updatedUser = new UserEntity({
            ...mockUser,
            username: 'newjohn',
         });
         mockQueryService.getUserById.mockResolvedValue(mockUser);
         mockRepo.update.mockResolvedValue(updatedUser);

         const op = new UpdateUsernameOperation(mockRepo, mockQueryService, mockSyncService, mockPipeline);

         const result = await op.execute({
            userId: 'u-1',
            username: 'newjohn',
         });

         expect(result).toEqual(updatedUser);
         expect(mockPipeline.validate).toHaveBeenCalledWith(
            expect.objectContaining({
               operation: PROFILE_OPERATIONS.UPDATE,
               userId: 'u-1',
               username: 'newjohn',
               existingUser: mockUser,
            }),
         );
         expect(mockRepo.update).toHaveBeenCalledWith('u-1', { username: 'newjohn' });
         expect(mockSyncService.syncUserUpdated).toHaveBeenCalledWith(updatedUser, { username: 'newjohn' }, mockUser);
      });
   });

   describe('DeleteProfileOperation', () => {
      it('should look up user, soft delete in repository, and trigger sync', async () => {
         mockQueryService.getUserById.mockResolvedValue(mockUser);
         mockRepo.softDelete.mockResolvedValue(mockUser);

         const op = new DeleteProfileOperation(mockRepo, mockQueryService, mockSyncService);

         const result = await op.execute({ userId: 'u-1' });

         expect(result).toEqual(mockUser);
         expect(mockQueryService.getUserById).toHaveBeenCalledWith('u-1');
         expect(mockRepo.softDelete).toHaveBeenCalledWith('u-1');
         expect(mockSyncService.syncUserDeleted).toHaveBeenCalledWith('u-1', 'acc-1');
      });
   });

   describe('RestoreProfileOperation', () => {
      it('should restore in repository and trigger sync', async () => {
         mockRepo.restore.mockResolvedValue(mockUser);

         const op = new RestoreProfileOperation(mockRepo, mockSyncService);

         const result = await op.execute({ userId: 'u-1' });

         expect(result).toEqual(mockUser);
         expect(mockRepo.restore).toHaveBeenCalledWith('u-1');
         expect(mockSyncService.syncUserRestored).toHaveBeenCalledWith(mockUser);
      });
   });
});
