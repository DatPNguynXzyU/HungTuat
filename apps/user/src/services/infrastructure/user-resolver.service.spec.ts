import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@common';
import { UserEntity, UserStatus } from '@user/entities';
import { USER_PROFILE_REPOSITORY } from '@user/repositories/user-profile.repository';
import { UserResolverService } from '@user/services/infrastructure/user-resolver.service';

describe('UserResolverService (Infrastructure)', () => {
   let service: UserResolverService;

   const mockUser = new UserEntity({
      userId: 'usr_123',
      accountId: 'acc_456',
      username: 'testuser',
      status: UserStatus.ACTIVE,
   });

   const mockUserProfileRepository = {
      findById: jest.fn(),
      findByAccountId: jest.fn(),
      findByUsername: jest.fn(),
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            UserResolverService,
            {
               provide: USER_PROFILE_REPOSITORY,
               useValue: mockUserProfileRepository,
            },
         ],
      }).compile();

      service = module.get<UserResolverService>(UserResolverService);
   });

   it('should be defined', () => {
      expect(service).toBeDefined();
   });

   describe('findUser', () => {
      it('should return user when found by findById', async () => {
         mockUserProfileRepository.findById.mockResolvedValue(mockUser);

         const result = await service.findUser('usr_123');

         expect(result).toBe(mockUser);
         expect(mockUserProfileRepository.findById).toHaveBeenCalledWith('usr_123');
         expect(mockUserProfileRepository.findByAccountId).not.toHaveBeenCalled();
      });

      it('should fallback to findByAccountId when not found by findById', async () => {
         mockUserProfileRepository.findById.mockResolvedValue(null);
         mockUserProfileRepository.findByAccountId.mockResolvedValue(mockUser);

         const result = await service.findUser('acc_456');

         expect(result).toBe(mockUser);
         expect(mockUserProfileRepository.findById).toHaveBeenCalledWith('acc_456');
         expect(mockUserProfileRepository.findByAccountId).toHaveBeenCalledWith('acc_456');
      });

      it('should return null when neither findById nor findByAccountId finds user', async () => {
         mockUserProfileRepository.findById.mockResolvedValue(null);
         mockUserProfileRepository.findByAccountId.mockResolvedValue(null);

         const result = await service.findUser('unknown_id');

         expect(result).toBeNull();
      });
   });

   describe('resolveUser', () => {
      it('should return user when found', async () => {
         mockUserProfileRepository.findById.mockResolvedValue(mockUser);

         const result = await service.resolveUser('usr_123');

         expect(result).toBe(mockUser);
      });

      it('should throw NotFoundException when user is not found', async () => {
         mockUserProfileRepository.findById.mockResolvedValue(null);
         mockUserProfileRepository.findByAccountId.mockResolvedValue(null);

         await expect(service.resolveUser('missing_id')).rejects.toThrow(NotFoundException);
      });
   });
});
