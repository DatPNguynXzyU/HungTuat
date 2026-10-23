import { Test, TestingModule } from '@nestjs/testing';
import { RmqContext } from '@nestjs/microservices';
import { CommandBus, RmqService } from '@common';
import { UserController } from '@user/user.controller';
import { UserEntity, UserStatus } from '@user/entities';

describe('UserController', () => {
   let controller: UserController;
   let commandBus: CommandBus;
   let rmqService: RmqService;

   const mockUser: UserEntity = {
      userId: 'user-123',
      accountId: 'acc-123',
      username: 'john_doe',
      displayName: 'John Doe',
      bio: 'Hello world',
      avatar: 'https://example.com/avatar.jpg',
      coverImage: 'https://example.com/cover.jpg',
      website: 'https://example.com',
      location: 'New York, USA',
      status: UserStatus.ACTIVE,
      isPrivate: false,
      isVerified: false,
      followersCount: 10,
      followingCount: 5,
      postsCount: 0,
      recipesCount: 0,
      lastActiveAt: null,
      lastUsernameChangedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      profile: null,
      stats: null,
      settings: null,
   };

   const mockCommandBus = {
      execute: jest.fn(),
   };

   const mockRmqService = {
      ack: jest.fn(),
   };

   const mockRmqContext = {
      getChannelRef: jest.fn(),
      getMessage: jest.fn(),
   } as unknown as RmqContext;

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         controllers: [UserController],
         providers: [
            {
               provide: CommandBus,
               useValue: mockCommandBus,
            },
            {
               provide: RmqService,
               useValue: mockRmqService,
            },
         ],
      }).compile();

      controller = module.get<UserController>(UserController);
      commandBus = module.get<CommandBus>(CommandBus);
      rmqService = module.get<RmqService>(RmqService);
   });

   it('should be defined', () => {
      expect(controller).toBeDefined();
      expect(commandBus).toBeDefined();
      expect(rmqService).toBeDefined();
   });

   describe('healthCheck', () => {
      it('should return health status', () => {
         const result = controller.healthCheck();
         expect(result.status).toBe('ok');
         expect(result.service).toBe('user');
         expect(result.timestamp).toBeDefined();
      });
   });

   describe('handleUserRegistered', () => {
      it('should handle handleUserRegistered and ack message on success', async () => {
         mockCommandBus.execute.mockResolvedValue(mockUser);
         const payload = { accountId: 'acc-123', email: 'test@example.com' };

         const result = await controller.handleUserRegistered(payload, mockRmqContext);

         expect(mockCommandBus.execute).toHaveBeenCalled();
         expect(mockRmqService.ack).toHaveBeenCalledWith(mockRmqContext);
         expect(result).toBe(mockUser);
      });

      it('should ack message and rethrow error if command fails', async () => {
         const error = new Error('Registration failed');
         mockCommandBus.execute.mockRejectedValue(error);
         const payload = { accountId: 'acc-123', email: 'test@example.com' };

         await expect(controller.handleUserRegistered(payload, mockRmqContext)).rejects.toThrow(error);
         expect(mockRmqService.ack).toHaveBeenCalledWith(mockRmqContext);
      });
   });
});
