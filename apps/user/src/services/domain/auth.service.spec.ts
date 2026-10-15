import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@common';
import { AuthService } from '@user/services/domain/auth.service';
import { ProfileService } from '@user/services/domain/profile.service';
import { UsernameBloomFilterService } from '@user/services/infrastructure/username-bloom-filter.service';
import { UserResolverService } from '@user/services/infrastructure/user-resolver.service';
import { UserEntity } from '@user/core/database/entities';

describe('AuthService (Domain)', () => {
   let service: AuthService;

   const mockUserResolverService = {
      findByAccountId: jest.fn(),
   };

   const mockProfileService = {
      createUser: jest.fn(),
   };

   const mockUsernameBloomFilterService = {
      isUsernameAvailable: jest.fn().mockResolvedValue(true),
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            AuthService,
            {
               provide: UserResolverService,
               useValue: mockUserResolverService,
            },
            {
               provide: ProfileService,
               useValue: mockProfileService,
            },
            {
               provide: UsernameBloomFilterService,
               useValue: mockUsernameBloomFilterService,
            },
         ],
      }).compile();

      service = module.get<AuthService>(AuthService);
   });

   it('should be defined', () => {
      expect(service).toBeDefined();
   });

   describe('checkUsername', () => {
      it('should check bloom filter for availability with normalized lowercase username', async () => {
         mockUsernameBloomFilterService.isUsernameAvailable.mockResolvedValue(true);

         const result = await service.checkUsername('  JohnDoe  ');

         expect(mockUsernameBloomFilterService.isUsernameAvailable).toHaveBeenCalledWith('johndoe');
         expect(result).toEqual({ available: true, username: 'johndoe' });
      });
   });

   describe('handleUserRegistered', () => {
      it('should return null if accountId is empty', async () => {
         const result = await service.handleUserRegistered({ accountId: '' });
         expect(result).toBeNull();
      });

      it('should return existing user if accountId already registered (idempotency)', async () => {
         const mockUser = { userId: 'uuid-1', accountId: 'acc-1' } as unknown as UserEntity;
         mockUserResolverService.findByAccountId.mockResolvedValue(mockUser);

         const result = await service.handleUserRegistered({ accountId: 'acc-1' });

         expect(result).toBe(mockUser);
         expect(mockProfileService.createUser).not.toHaveBeenCalled();
      });

      it('should provision user profile and extract base username from email when available', async () => {
         mockUserResolverService.findByAccountId.mockResolvedValue(null);
         mockUsernameBloomFilterService.isUsernameAvailable.mockResolvedValue(true);
         const createdUser = { userId: 'uuid-2', accountId: 'acc-2', username: 'alice' } as unknown as UserEntity;
         mockProfileService.createUser.mockResolvedValue(createdUser);

         const result = await service.handleUserRegistered({
            accountId: 'acc-2',
            email: 'Alice@example.com',
         });

         expect(mockProfileService.createUser).toHaveBeenCalledWith(
            expect.objectContaining({
               accountId: 'acc-2',
               username: 'alice',
               displayName: 'alice',
            }),
         );
         expect(result).toBe(createdUser);
      });

      it('should append numeric suffix if base username from email is taken', async () => {
         mockUserResolverService.findByAccountId.mockResolvedValue(null);
         mockUsernameBloomFilterService.isUsernameAvailable.mockResolvedValue(false);
         const createdUser = { userId: 'uuid-3', accountId: 'acc-3' } as unknown as UserEntity;
         mockProfileService.createUser.mockResolvedValue(createdUser);

         await service.handleUserRegistered({
            accountId: 'acc-3',
            email: 'bob@example.com',
         });

         expect(mockProfileService.createUser).toHaveBeenCalledWith(
            expect.objectContaining({
               accountId: 'acc-3',
               displayName: 'bob',
               username: expect.stringMatching(/^bob_\d{4}$/),
            }),
         );
      });

      it('should retry with random suffix upon ConflictException on username', async () => {
         mockUserResolverService.findByAccountId.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
         mockUsernameBloomFilterService.isUsernameAvailable.mockResolvedValue(true);
         const createdUser = { userId: 'uuid-4', accountId: 'acc-4' } as unknown as UserEntity;
         mockProfileService.createUser
            .mockRejectedValueOnce(new ConflictException('Username conflict'))
            .mockResolvedValueOnce(createdUser);

         const result = await service.handleUserRegistered({
            accountId: 'acc-4',
            email: 'charlie@example.com',
         });

         expect(mockProfileService.createUser).toHaveBeenCalledTimes(2);
         expect(result).toBe(createdUser);
      });
   });
});
