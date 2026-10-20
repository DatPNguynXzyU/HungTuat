import { Test, TestingModule } from '@nestjs/testing';
import { firstValueFrom } from 'rxjs';
import { CommandBus, GrpcLoggingInterceptor, GrpcMetricsInterceptor } from '@common';
import { UserGrpcController } from '@user/adapters/grpc/user-grpc.controller';
import { CheckUsernameCommand } from '@user/commands/authentication/check-username.command';

describe('UserGrpcController', () => {
   let controller: UserGrpcController;
   let commandBus: jest.Mocked<CommandBus>;

   beforeEach(async () => {
      const mockCommandBus = {
         execute: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
         controllers: [UserGrpcController],
         providers: [
            {
               provide: CommandBus,
               useValue: mockCommandBus,
            },
         ],
      }).compile();

      controller = module.get<UserGrpcController>(UserGrpcController);
      commandBus = module.get<CommandBus>(CommandBus) as jest.Mocked<CommandBus>;
   });

   it('should be defined', () => {
      expect(controller).toBeDefined();
   });

   it('should have GrpcLoggingInterceptor and GrpcMetricsInterceptor applied', () => {
      const interceptors = Reflect.getMetadata('__interceptors__', UserGrpcController);
      expect(interceptors).toBeDefined();
      expect(interceptors).toContain(GrpcLoggingInterceptor);
      expect(interceptors).toContain(GrpcMetricsInterceptor);
   });

   describe('checkUsername', () => {
      it('should execute CheckUsernameCommand and return availability result', async () => {
         const expectedResponse = {
            available: true,
            username: 'john_doe',
         };
         commandBus.execute.mockResolvedValue(expectedResponse);

         const result = await firstValueFrom(controller.checkUsername({ username: 'john_doe' }));

         expect(commandBus.execute).toHaveBeenCalledWith(new CheckUsernameCommand('john_doe'));
         expect(result).toEqual(expectedResponse);
      });

      it('should propagate error if command execution fails', async () => {
         const error = new Error('Username validation failed');
         commandBus.execute.mockRejectedValue(error);

         await expect(firstValueFrom(controller.checkUsername({ username: 'invalid_user' }))).rejects.toThrow(error);
      });
   });
});
