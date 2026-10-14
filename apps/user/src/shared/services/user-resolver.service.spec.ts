import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@common';
import { USER_ERROR_CODES } from '@contracts/user';
import { UserEntity, UserStatus } from '@user/core/database/entities';
import { USER_PROFILE_REPOSITORY } from '@user/modules/profile/repositories/user-profile.repository';
import { UserResolverService } from '@user/shared/services/user-resolver.service';

describe('UserResolverService', () => {
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

         try {
            await service.resolveUser('missing_id');
         } catch (error: unknown) {
            expect(error).toBeInstanceOf(NotFoundException);
            const notFound = error as NotFoundException;
            expect(notFound.message).toBe(USER_ERROR_CODES.USER_NOT_FOUND);
         }
      });
   });

   describe('resolveById', () => {
      it('should return user when found by userId', async () => {
         mockUserProfileRepository.findById.mockResolvedValue(mockUser);

         const result = await service.resolveById('usr_123');

         expect(result).toBe(mockUser);
         expect(mockUserProfileRepository.findById).toHaveBeenCalledWith('usr_123');
      });

      it('should throw NotFoundException when userId does not exist', async () => {
         mockUserProfileRepository.findById.mockResolvedValue(null);

         await expect(service.resolveById('missing_id')).rejects.toThrow(NotFoundException);
      });
   });

   describe('resolveByAccountId', () => {
      it('should return user when found by accountId', async () => {
         mockUserProfileRepository.findByAccountId.mockResolvedValue(mockUser);

         const result = await service.resolveByAccountId('acc_456');

         expect(result).toBe(mockUser);
         expect(mockUserProfileRepository.findByAccountId).toHaveBeenCalledWith('acc_456');
      });

      it('should throw NotFoundException when accountId does not exist', async () => {
         mockUserProfileRepository.findByAccountId.mockResolvedValue(null);

         await expect(service.resolveByAccountId('missing_acc')).rejects.toThrow(NotFoundException);
      });
   });

   describe('resolveByUsername', () => {
      it('should return user when found by username', async () => {
         mockUserProfileRepository.findByUsername.mockResolvedValue(mockUser);

         const result = await service.resolveByUsername('testuser');

         expect(result).toBe(mockUser);
         expect(mockUserProfileRepository.findByUsername).toHaveBeenCalledWith('testuser');
      });

      it('should throw NotFoundException when username does not exist', async () => {
         mockUserProfileRepository.findByUsername.mockResolvedValue(null);

         await expect(service.resolveByUsername('nonexistent')).rejects.toThrow(NotFoundException);
      });
   });

   describe('findByAccountId', () => {
      it('should return user without throwing when found', async () => {
         mockUserProfileRepository.findByAccountId.mockResolvedValue(mockUser);

         const result = await service.findByAccountId('acc_456');

         expect(result).toBe(mockUser);
      });

      it('should return null when not found', async () => {
         mockUserProfileRepository.findByAccountId.mockResolvedValue(null);

         const result = await service.findByAccountId('missing_acc');

         expect(result).toBeNull();
      });
   });

   describe('findByUsername', () => {
      it('should return user without throwing when found', async () => {
         mockUserProfileRepository.findByUsername.mockResolvedValue(mockUser);

         const result = await service.findByUsername('testuser');

         expect(result).toBe(mockUser);
      });

      it('should return null when not found', async () => {
         mockUserProfileRepository.findByUsername.mockResolvedValue(null);

         const result = await service.findByUsername('missing_user');

         expect(result).toBeNull();
      });
   });
});
