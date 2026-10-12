import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { USER_PROFILE_REPOSITORY } from '@user/modules/profile/repositories/user-profile.repository';
import { ProfileService } from '@user/modules/profile/profile.service';
import { UsernameBloomFilterService } from './services/username-bloom-filter.service';
import { EmailValidatorService } from './services/email-validator.service';
import { UserEntity, UserStatus } from '@user/core/database/entities';

describe('AuthService', () => {
   let service: AuthService;

   const mockUserProfileRepository = {
      findByAccountId: jest.fn(),
   };

   const mockProfileService = {
      createUser: jest.fn(),
   };

   const mockUsernameBloomFilterService = {
      isUsernameAvailable: jest.fn().mockResolvedValue(true),
   };

   const mockEmailValidatorService = {
      isValid: jest.fn().mockReturnValue(true),
      extractBaseUsername: jest.fn().mockReturnValue('testuser'),
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            AuthService,
            {
               provide: USER_PROFILE_REPOSITORY,
               useValue: mockUserProfileRepository,
            },
            {
               provide: ProfileService,
               useValue: mockProfileService,
            },
            {
               provide: UsernameBloomFilterService,
               useValue: mockUsernameBloomFilterService,
            },
            {
               provide: EmailValidatorService,
               useValue: mockEmailValidatorService,
            },
         ],
      }).compile();

      service = module.get<AuthService>(AuthService);
   });

   it('should be defined', () => {
      expect(service).toBeDefined();
   });

   it('should check username availability', async () => {
      const result = await service.checkUsername('testuser');
      expect(result).toEqual({ available: true, username: 'testuser' });
   });

   it('should handle user registered event', async () => {
      mockUserProfileRepository.findByAccountId.mockResolvedValue(null);
      const mockCreated = new UserEntity({
         userId: 'u1',
         accountId: 'acc1',
         username: 'testuser',
         status: UserStatus.ACTIVE,
      });
      mockProfileService.createUser.mockResolvedValue(mockCreated);

      const result = await service.handleUserRegistered({
         accountId: 'acc1',
         email: 'testuser@example.com',
      });
      expect(result).toEqual(mockCreated);
   });
});
