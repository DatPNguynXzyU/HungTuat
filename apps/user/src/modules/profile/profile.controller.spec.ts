import { Test, TestingModule } from '@nestjs/testing';
import { RmqService } from '@common';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
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
});
