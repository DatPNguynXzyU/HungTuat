import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, RmqService, type ICommandHandler } from '@common';
import { AuthController } from '@user/modules/authentication/auth.controller';
import { AuthService } from '@user/services/domain/auth.service';
import { USER_AUTH_COMMAND_HANDLERS } from '@user/commands/authentication';

describe('AuthController', () => {
   let controller: AuthController;

   const mockAuthService = {
      handleUserRegistered: jest.fn(),
      checkUsername: jest.fn(),
   };

   const mockRmqService = {
      ack: jest.fn(),
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         controllers: [AuthController],
         providers: [
            CommandBus,
            ...USER_AUTH_COMMAND_HANDLERS,
            {
               provide: AuthService,
               useValue: mockAuthService,
            },
            {
               provide: RmqService,
               useValue: mockRmqService,
            },
         ],
      }).compile();

      const commandBus = module.get<CommandBus>(CommandBus);
      for (const handlerClass of USER_AUTH_COMMAND_HANDLERS) {
         const handler = module.get<ICommandHandler<never, never>>(handlerClass);
         if (handler) {
            commandBus.registerHandler(handler);
         }
      }

      controller = module.get<AuthController>(AuthController);
   });

   it('should be defined', () => {
      expect(controller).toBeDefined();
   });

   it('should check username', async () => {
      mockAuthService.checkUsername.mockResolvedValue({ available: true, username: 'test' });
      const result = await controller.checkUsername({ username: 'test' });
      expect(result).toEqual({ available: true, username: 'test' });
   });
});
