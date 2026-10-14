import { Test, TestingModule } from '@nestjs/testing';
import { CloudinaryService, SERVICES } from '@common';
import { ProfileService } from '@user/modules/profile/profile.service';
import { USER_PROFILE_REPOSITORY } from '@user/modules/profile/repositories/user-profile.repository';
import { OutboxService } from '@user/core/outbox';
import { UsernameBloomFilterService } from '@user/modules/authentication';
import { UserGraphSyncService } from '@user/modules/follow';
import { UserEntity, UserStatus } from '@user/core/database/entities';

describe('ProfileService', () => {
   let service: ProfileService;

   const mockUserProfileRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByAccountId: jest.fn(),
      findByUsername: jest.fn(),
      findDateOfBirth: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
   };

   const mockCloudinaryService = {
      uploadBase64: jest.fn(),
      generateUploadSignature: jest.fn(),
   };

   const mockOutboxService = {
      createOutboxEvent: jest.fn().mockResolvedValue({ id: 'outbox-1' }),
   };

   const mockUsernameBloomFilterService = {
      mightContain: jest.fn().mockResolvedValue(false),
      addUsername: jest.fn().mockResolvedValue(undefined),
   };

   const mockUserGraphSyncService = {
      syncUserToGraph: jest.fn().mockResolvedValue(undefined),
   };

   const mockSearchClient = {
      emit: jest.fn(),
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            ProfileService,
            {
               provide: USER_PROFILE_REPOSITORY,
               useValue: mockUserProfileRepository,
            },
            {
               provide: CloudinaryService,
               useValue: mockCloudinaryService,
            },
            {
               provide: OutboxService,
               useValue: mockOutboxService,
            },
            {
               provide: UsernameBloomFilterService,
               useValue: mockUsernameBloomFilterService,
            },
            {
               provide: UserGraphSyncService,
               useValue: mockUserGraphSyncService,
            },
            {
               provide: SERVICES.SEARCH_SERVICE,
               useValue: mockSearchClient,
            },
         ],
      }).compile();

      service = module.get<ProfileService>(ProfileService);
   });

   it('should be defined', () => {
      expect(service).toBeDefined();
   });

   it('should get user by id', async () => {
      const mockUser = new UserEntity({
         userId: 'u1',
         accountId: 'acc1',
         status: UserStatus.ACTIVE,
      });
      mockUserProfileRepository.findById.mockResolvedValue(mockUser);

      const result = await service.getUserById('u1');
      expect(result).toEqual(mockUser);
   });

   it('should get date of birth and calculate age correctly', async () => {
      mockUserProfileRepository.findDateOfBirth.mockResolvedValue({
         userId: 'u1',
         dateOfBirth: new Date('2000-01-01'),
      });

      const result = await service.getDateOfBirth('u1');
      expect(result.userId).toBe('u1');
      expect(result.age).toBeGreaterThan(0);
   });
});
