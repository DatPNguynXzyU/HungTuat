import { Test, TestingModule } from '@nestjs/testing';
import { CloudinaryService, ConflictException } from '@common';
import { UserService } from './user.service';
import { UserRepository, FollowRepository } from './repositories';
import { OutboxService } from './outbox';
import { GraphFollowRepository } from '@user/graph';
import { UserGraphSyncService, UsernameBloomFilterService } from '@user/services';
import { UserSearchService } from '@user/search';
import { UserEntity, UserStatus } from '@user/entities';

describe('UserService', () => {
   let service: UserService;
   const mockUserRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByAccountId: jest.fn(),
      findByUsername: jest.fn(),
      findAllUsernames: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
      incrementFollowersCount: jest.fn(),
      decrementFollowersCount: jest.fn(),
      incrementFollowingCount: jest.fn(),
      decrementFollowingCount: jest.fn(),
      findDateOfBirth: jest.fn(),
   };
   const mockFollowRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByFollowerAndFollowing: jest.fn(),
      findAllActive: jest.fn(),
      findFollowers: jest.fn(),
      findFollowing: jest.fn(),
      countFollowers: jest.fn(),
      countFollowing: jest.fn(),
      updateStatus: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
   };
   const mockOutboxService = {
      createOutboxEvent: jest.fn().mockResolvedValue({ id: 'outbox-1' }),
   };
   const mockGraphFollowRepository = {
      createOrUpdateUser: jest.fn().mockResolvedValue(undefined),
      createFollow: jest.fn(),
      updateFollowStatus: jest.fn(),
      deleteFollow: jest.fn(),
      findFollow: jest.fn(),
      getFollowers: jest.fn(),
      getFollowing: jest.fn(),
      countFollowers: jest.fn(),
      countFollowing: jest.fn(),
      getMutualFollowers: jest.fn(),
      getFollowSuggestions: jest.fn(),
   };
   const mockUserGraphSyncService = {
      syncUserToGraph: jest.fn().mockResolvedValue(undefined),
      syncUsersToGraph: jest.fn().mockResolvedValue(undefined),
   };
   const mockUsernameBloomFilterService = {
      mightContain: jest.fn().mockResolvedValue(false),
      addUsername: jest.fn().mockResolvedValue(undefined),
      isUsernameAvailable: jest.fn().mockResolvedValue(true),
   };
   const mockUserSearchService = {
      indexUser: jest.fn().mockResolvedValue(undefined),
      updateUser: jest.fn().mockResolvedValue(undefined),
      deleteUser: jest.fn().mockResolvedValue(undefined),
      searchUsers: jest.fn().mockResolvedValue([]),
   };
   const mockCloudinaryService = {
      uploadBase64: jest.fn().mockResolvedValue({
         secureUrl: 'https://cloudinary.com/avatar.jpg',
         publicId: 'avatar_123',
      }),
      generateUploadSignature: jest.fn().mockReturnValue({
         timestamp: 1234567890,
         signature: 'mock_signature',
         apiKey: 'mock_key',
      }),
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            UserService,
            {
               provide: UserRepository,
               useValue: mockUserRepository,
            },
            {
               provide: FollowRepository,
               useValue: mockFollowRepository,
            },
            {
               provide: OutboxService,
               useValue: mockOutboxService,
            },
            {
               provide: GraphFollowRepository,
               useValue: mockGraphFollowRepository,
            },
            {
               provide: UserGraphSyncService,
               useValue: mockUserGraphSyncService,
            },
            {
               provide: UsernameBloomFilterService,
               useValue: mockUsernameBloomFilterService,
            },
            {
               provide: UserSearchService,
               useValue: mockUserSearchService,
            },
            {
               provide: CloudinaryService,
               useValue: mockCloudinaryService,
            },
         ],
      }).compile();

      service = module.get<UserService>(UserService);
   });

   it('should be defined', () => {
      expect(service).toBeDefined();
   });

   describe('checkUsername', () => {
      it('should return availability status via UsernameBloomFilterService', async () => {
         mockUsernameBloomFilterService.isUsernameAvailable.mockResolvedValue(true);

         const result = await service.checkUsername('john_doe');

         expect(mockUsernameBloomFilterService.isUsernameAvailable).toHaveBeenCalledWith('john_doe');
         expect(result).toEqual({ available: true, username: 'john_doe' });
      });
   });

   describe('createUser', () => {
      it('should create user with profile, stats and settings and sync to graph and bloom filter', async () => {
         mockUserRepository.findByAccountId.mockResolvedValue(null);
         mockUsernameBloomFilterService.mightContain.mockResolvedValue(false);

         const createdUser = new UserEntity({
            id: 'user-id-1',
            accountId: 'auth-user-1',
            username: 'johndoe',
            status: UserStatus.ACTIVE,
            createdAt: new Date(),
            updatedAt: new Date(),
            profile: {
               id: 'profile-1',
               userId: 'user-id-1',
               displayName: 'John Doe',
               bio: null,
               avatar: null,
               coverImage: null,
               website: null,
               location: null,
               dateOfBirth: null,
               gender: null,
               createdAt: new Date(),
               updatedAt: new Date(),
            },
         });

         mockUserRepository.create.mockResolvedValue(createdUser);

         const res = await service.createUser({
            accountId: 'auth-user-1',
            username: 'johndoe',
            displayName: 'John Doe',
         });

         expect(mockUserRepository.create).toHaveBeenCalledWith({
            accountId: 'auth-user-1',
            username: 'johndoe',
            displayName: 'John Doe',
         });
         expect(mockUsernameBloomFilterService.addUsername).toHaveBeenCalledWith('johndoe');
         expect(mockUserGraphSyncService.syncUserToGraph).toHaveBeenCalledWith(createdUser);
         expect(mockOutboxService.createOutboxEvent).toHaveBeenCalled();
         expect(res.displayName).toBe('John Doe');
      });

      it('should map Prisma unique constraint error on accountId to ConflictException', async () => {
         mockUserRepository.findByAccountId.mockResolvedValue(null);
         const prismaError = Object.assign(
            new Error('Unique constraint failed on the constraint: users_account_id_key'),
            {
               code: 'P2002',
               meta: { target: ['account_id'] },
            },
         );
         mockUserRepository.create.mockRejectedValue(prismaError);

         await expect(
            service.createUser({
               accountId: 'auth-user-dup',
               username: 'unique_user',
            }),
         ).rejects.toThrow(ConflictException);
      });
   });

   describe('handleUserRegistered', () => {
      it('should create user when receiving USER_REGISTERED event from RabbitMQ', async () => {
         mockUserRepository.findByAccountId.mockResolvedValue(null);
         const createdUser = new UserEntity({
            id: 'user-id-2',
            accountId: 'auth-user-2',
            status: UserStatus.ACTIVE,
            createdAt: new Date(),
            updatedAt: new Date(),
            profile: {
               id: 'profile-2',
               userId: 'user-id-2',
               displayName: 'alice',
               bio: null,
               avatar: null,
               coverImage: null,
               website: null,
               location: null,
               dateOfBirth: null,
               gender: null,
               createdAt: new Date(),
               updatedAt: new Date(),
            },
         });
         mockUserRepository.create.mockResolvedValue(createdUser);

         const res = await service.handleUserRegistered({
            accountId: 'auth-user-2',
            email: 'alice@example.com',
         });

         expect(mockUserRepository.create).toHaveBeenCalledWith({
            accountId: 'auth-user-2',
            username: 'alice',
            displayName: 'alice',
         });
         expect(res?.displayName).toBe('alice');
      });

      it('should return existing user if concurrent creation occurs (race condition)', async () => {
         const existingUser = new UserEntity({
            id: 'user-id-concurrent',
            accountId: 'auth-user-concurrent',
            status: UserStatus.ACTIVE,
            createdAt: new Date(),
            updatedAt: new Date(),
            profile: {
               id: 'profile-concurrent',
               userId: 'user-id-concurrent',
               displayName: 'concurrent',
               bio: null,
               avatar: null,
               coverImage: null,
               website: null,
               location: null,
               dateOfBirth: null,
               gender: null,
               createdAt: new Date(),
               updatedAt: new Date(),
            },
         });

         mockUserRepository.findByAccountId
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(existingUser);

         const prismaError = Object.assign(
            new Error('Unique constraint failed on the constraint: users_account_id_key'),
            {
               code: 'P2002',
               meta: { target: ['account_id'] },
            },
         );
         mockUserRepository.create.mockRejectedValue(prismaError);

         const res = await service.handleUserRegistered({
            accountId: 'auth-user-concurrent',
            email: 'concurrent@example.com',
         });

         expect(res?.id).toBe('user-id-concurrent');
      });
   });

   describe('updateUserProfile', () => {
      it('should update user profile and sync to graph when user exists', async () => {
         const existingUser = new UserEntity({
            id: 'user-id-1',
            accountId: 'auth-user-1',
            status: UserStatus.ACTIVE,
            createdAt: new Date(),
            updatedAt: new Date(),
         });
         const updatedUser = new UserEntity({
            id: 'user-id-1',
            accountId: 'auth-user-1',
            status: UserStatus.ACTIVE,
            createdAt: new Date(),
            updatedAt: new Date(),
            profile: {
               id: 'profile-1',
               userId: 'user-id-1',
               displayName: 'New Name',
               bio: 'New Bio',
               avatar: null,
               coverImage: null,
               website: null,
               location: null,
               dateOfBirth: null,
               gender: null,
               createdAt: new Date(),
               updatedAt: new Date(),
            },
         });

         mockUserRepository.findById.mockResolvedValue(existingUser);
         mockUserRepository.update.mockResolvedValue(updatedUser);

         const res = await service.updateUserProfile('user-id-1', {
            displayName: 'New Name',
            bio: 'New Bio',
         });

         expect(mockUserRepository.update).toHaveBeenCalledWith('user-id-1', {
            displayName: 'New Name',
            bio: 'New Bio',
         });
         expect(mockUserGraphSyncService.syncUserToGraph).toHaveBeenCalledWith(updatedUser);
         expect(res.displayName).toBe('New Name');
         expect(res.bio).toBe('New Bio');
      });

      it('should auto-create user and user profile if user does not exist in User Service yet', async () => {
         mockUserRepository.findById.mockResolvedValue(null);
         mockUserRepository.findByAccountId.mockResolvedValue(null);

         const createdUser = new UserEntity({
            id: 'auto-user-id',
            accountId: 'auth-sub-123',
            username: 'autouser',
            status: UserStatus.ACTIVE,
            createdAt: new Date(),
            updatedAt: new Date(),
            profile: {
               id: 'profile-auto',
               userId: 'auto-user-id',
               displayName: 'Auto Name',
               bio: null,
               avatar: null,
               coverImage: null,
               website: null,
               location: null,
               dateOfBirth: null,
               gender: null,
               createdAt: new Date(),
               updatedAt: new Date(),
            },
         });

         mockUserRepository.create.mockResolvedValue(createdUser);

         const res = await service.updateUserProfile('auth-sub-123', {
            username: 'autouser',
            displayName: 'Auto Name',
         });

         expect(mockUserRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({
               accountId: 'auth-sub-123',
               username: 'autouser',
               displayName: 'Auto Name',
            }),
         );
         expect(res.displayName).toBe('Auto Name');
      });
   });

   describe('getDateOfBirth', () => {
      it('should return date of birth and calculated age when dateOfBirth is present', async () => {
         const birthDate = new Date('1990-05-20');
         mockUserRepository.findDateOfBirth.mockResolvedValue({
            userId: 'user-sub-1',
            dateOfBirth: birthDate,
         });

         const result = await service.getDateOfBirth('u1');
         expect(mockUserRepository.findDateOfBirth).toHaveBeenCalledWith('u1');
         expect(result.userId).toBe('user-sub-1');
         expect(result.dateOfBirth).toEqual(birthDate);
         expect(typeof result.age).toBe('number');
         expect(result.age).toBeGreaterThan(0);
      });

      it('should return null dateOfBirth and null age when not set', async () => {
         mockUserRepository.findDateOfBirth.mockResolvedValue({
            userId: 'user-sub-2',
            dateOfBirth: null,
         });

         const result = await service.getDateOfBirth('u2');
         expect(mockUserRepository.findDateOfBirth).toHaveBeenCalledWith('u2');
         expect(result.userId).toBe('user-sub-2');
         expect(result.dateOfBirth).toBeNull();
         expect(result.age).toBeNull();
      });

      it('should throw NotFoundException when user does not exist', async () => {
         mockUserRepository.findDateOfBirth.mockResolvedValue(null);

         await expect(service.getDateOfBirth('non-existent')).rejects.toThrow();
      });

      it('should calculate age correctly with calculateAge', () => {
         expect(service.calculateAge(null)).toBeNull();
         expect(service.calculateAge(undefined)).toBeNull();
         expect(service.calculateAge('invalid-date')).toBeNull();

         const now = new Date();
         const exactly20YearsAgo = new Date(now.getFullYear() - 20, now.getMonth(), now.getDate());
         expect(service.calculateAge(exactly20YearsAgo)).toBe(20);
      });
   });
});
