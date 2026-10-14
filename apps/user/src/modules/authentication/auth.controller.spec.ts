import { Test, TestingModule } from '@nestjs/testing';
import { RmqService } from '@common';
import { AuthController } from '@user/modules/authentication/auth.controller';
import { AuthService } from '@user/modules/authentication/auth.service';

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
