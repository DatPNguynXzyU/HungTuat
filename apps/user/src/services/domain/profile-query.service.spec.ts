import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@common';
import { ProfileQueryService } from '@user/services/domain/profile-query.service';
import { USER_PROFILE_REPOSITORY } from '@user/modules/profile/repositories/user-profile.repository';
import { UserResolverService } from '@user/services/infrastructure/user-resolver.service';
import { UserEntity, UserStatus } from '@user/core/database/entities';

describe('ProfileQueryService (Domain)', () => {
   let service: ProfileQueryService;

   const mockUserResolverService = {
      resolveUser: jest.fn(),
      resolveByAccountId: jest.fn(),
      resolveByUsername: jest.fn(),
   };

   const mockUserProfileRepository = {
      findDateOfBirth: jest.fn(),
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            ProfileQueryService,
            {
               provide: UserResolverService,
               useValue: mockUserResolverService,
            },
            {
               provide: USER_PROFILE_REPOSITORY,
               useValue: mockUserProfileRepository,
            },
         ],
      }).compile();

      service = module.get<ProfileQueryService>(ProfileQueryService);
   });

   it('should be defined', () => {
      expect(service).toBeDefined();
   });

   it('should resolve user by id', async () => {
      const mockUser = new UserEntity({
         userId: 'u1',
         accountId: 'acc1',
         status: UserStatus.ACTIVE,
      });
      mockUserResolverService.resolveUser.mockResolvedValue(mockUser);

      const result = await service.getUserById('u1');
      expect(result).toEqual(mockUser);
      expect(mockUserResolverService.resolveUser).toHaveBeenCalledWith('u1');
   });

   it('should resolve user by account id', async () => {
      const mockUser = new UserEntity({
         userId: 'u1',
         accountId: 'acc1',
         status: UserStatus.ACTIVE,
      });
      mockUserResolverService.resolveByAccountId.mockResolvedValue(mockUser);

      const result = await service.getUserByAccountId('acc1');
      expect(result).toEqual(mockUser);
      expect(mockUserResolverService.resolveByAccountId).toHaveBeenCalledWith('acc1');
   });

   it('should resolve user by username', async () => {
      const mockUser = new UserEntity({
         userId: 'u1',
         accountId: 'acc1',
         username: 'john',
         status: UserStatus.ACTIVE,
      });
      mockUserResolverService.resolveByUsername.mockResolvedValue(mockUser);

      const result = await service.getUserByUsername('john');
      expect(result).toEqual(mockUser);
      expect(mockUserResolverService.resolveByUsername).toHaveBeenCalledWith('john');
   });

   it('should return null age for null dob', () => {
      expect(service.calculateAge(null)).toBeNull();
      expect(service.calculateAge(undefined)).toBeNull();
   });

   it('should calculate age accurately for valid dob', () => {
      const age = service.calculateAge(new Date('1990-05-15'));
      expect(age).toBeGreaterThan(30);
   });

   it('should throw NotFoundException if date of birth record is missing', async () => {
      mockUserProfileRepository.findDateOfBirth.mockResolvedValue(null);

      await expect(service.getDateOfBirth('unknown')).rejects.toThrow(NotFoundException);
   });

   it('should return date of birth and calculated age', async () => {
      mockUserProfileRepository.findDateOfBirth.mockResolvedValue({
         userId: 'u1',
         dateOfBirth: new Date('2000-01-01'),
      });

      const result = await service.getDateOfBirth('u1');
      expect(result.userId).toBe('u1');
      expect(result.dateOfBirth).toEqual(new Date('2000-01-01'));
      expect(result.age).toBeGreaterThan(0);
   });
});
