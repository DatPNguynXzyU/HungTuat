import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { UserRepository, FollowRepository } from './repositories';
import { OutboxService } from './outbox';
import { GraphFollowRepository } from '@user/graph';
import { UserGraphSyncService, UsernameBloomFilterService } from '@user/services';
import { UserEntity, UserStatus } from '@user/entities';

describe('UserService', () => {
   let service: UserService;
   const mockUserRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
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
         mockUserRepository.findByUserId.mockResolvedValue(null);
         mockUsernameBloomFilterService.mightContain.mockResolvedValue(false);

         const createdUser = new UserEntity({
            id: 'user-id-1',
            userId: 'auth-user-1',
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
            userId: 'auth-user-1',
            username: 'johndoe',
            displayName: 'John Doe',
         });

         expect(mockUserRepository.create).toHaveBeenCalledWith({
            userId: 'auth-user-1',
            username: 'johndoe',
            displayName: 'John Doe',
         });
         expect(mockUsernameBloomFilterService.addUsername).toHaveBeenCalledWith('johndoe');
         expect(mockUserGraphSyncService.syncUserToGraph).toHaveBeenCalledWith(createdUser);
         expect(mockOutboxService.createOutboxEvent).toHaveBeenCalled();
         expect(res.displayName).toBe('John Doe');
      });
   });

   describe('handleUserRegistered', () => {
      it('should create user when receiving USER_REGISTERED event from RabbitMQ', async () => {
         mockUserRepository.findByUserId.mockResolvedValue(null);
         const createdUser = new UserEntity({
            id: 'user-id-2',
            userId: 'auth-user-2',
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
            userId: 'auth-user-2',
            email: 'alice@example.com',
         });

         expect(mockUserRepository.create).toHaveBeenCalledWith({
            userId: 'auth-user-2',
            username: 'alice',
            displayName: 'alice',
         });
         expect(res?.displayName).toBe('alice');
      });
   });

   describe('updateUserProfile', () => {
      it('should update user profile and sync to graph when user exists', async () => {
         const existingUser = new UserEntity({
            id: 'user-id-1',
            userId: 'auth-user-1',
            status: UserStatus.ACTIVE,
            createdAt: new Date(),
            updatedAt: new Date(),
         });
         const updatedUser = new UserEntity({
            id: 'user-id-1',
            userId: 'auth-user-1',
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
         mockUserRepository.findByUserId.mockResolvedValue(null);

         const createdUser = new UserEntity({
            id: 'auto-user-id',
            userId: 'auth-sub-123',
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
               userId: 'auth-sub-123',
               username: 'autouser',
               displayName: 'Auto Name',
            }),
         );
         expect(res.displayName).toBe('Auto Name');
      });
   });
});
