import { Test, TestingModule } from '@nestjs/testing';
import { RmqService } from '@common';
import { ProfileController } from '@user/modules/profile/profile.controller';
import { ProfileService } from '@user/modules/profile/profile.service';
import { UserEntity, UserStatus } from '@user/core/database/entities';

describe('ProfileController', () => {
   let controller: ProfileController;

   const mockProfileService = {
      getUserById: jest.fn(),
      getUserByUserId: jest.fn(),
      getUserByAccountId: jest.fn(),
      getUserByUsername: jest.fn(),
      createUser: jest.fn(),
      updateUserProfile: jest.fn(),
      upsertUserProfile: jest.fn(),
      updateUsername: jest.fn(),
      deleteUser: jest.fn(),
      restoreUser: jest.fn(),
      getDateOfBirth: jest.fn(),
      uploadAvatar: jest.fn(),
      getAvatarUploadSignature: jest.fn(),
   };

   const mockRmqService = {
      ack: jest.fn(),
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         controllers: [ProfileController],
         providers: [
            {
               provide: ProfileService,
               useValue: mockProfileService,
            },
            {
               provide: RmqService,
               useValue: mockRmqService,
            },
         ],
      }).compile();

      controller = module.get<ProfileController>(ProfileController);
   });

   it('should be defined', () => {
      expect(controller).toBeDefined();
   });

   it('should get user by id', async () => {
      const mockUser = new UserEntity({
         userId: 'u1',
         accountId: 'acc1',
         status: UserStatus.ACTIVE,
      });
      mockProfileService.getUserById.mockResolvedValue(mockUser);

      const result = await controller.getUserById({ data: { id: 'u1' } });
      expect(result).toEqual(mockUser);
   });

   it('should update user profile for authorized user', async () => {
      const mockUser = new UserEntity({
         userId: 'u1',
         accountId: 'acc1',
         status: UserStatus.ACTIVE,
      });
      mockProfileService.getUserById.mockResolvedValue(mockUser);
      mockProfileService.updateUserProfile.mockResolvedValue(mockUser);

      const result = await controller.updateUserProfile({
         data: { id: 'u1', displayName: 'Updated' },
         user: {
            userId: 'acc1',
            email: 'test@example.com',
            roles: ['user'],
            permissions: [],
         },
      });

      expect(mockProfileService.updateUserProfile).toHaveBeenCalledWith('u1', { displayName: 'Updated' });
      expect(result).toEqual(mockUser);
   });

   it('should upsert user profile', async () => {
      const mockUser = new UserEntity({
         userId: 'u1',
         accountId: 'acc1',
         status: UserStatus.ACTIVE,
      });
      mockProfileService.upsertUserProfile.mockResolvedValue(mockUser);

      const result = await controller.upsertUserProfile({
         data: { id: 'acc1', displayName: 'Upserted' },
         user: {
            userId: 'acc1',
            email: 'test@example.com',
            roles: ['user'],
            permissions: [],
         },
      });

      expect(mockProfileService.upsertUserProfile).toHaveBeenCalledWith('acc1', { displayName: 'Upserted' });
      expect(result).toEqual(mockUser);
   });
});
