import { Test, TestingModule } from '@nestjs/testing';
import { firstValueFrom } from 'rxjs';
import { CommandBus, GrpcLoggingInterceptor, GrpcMetricsInterceptor } from '@common';
import { AuthGrpcController } from '@auth/adapters/grpc/auth-grpc.controller';
import { CheckEmailCommand } from '@auth/commands/registration/check-email.command';

describe('AuthGrpcController', () => {
   let controller: AuthGrpcController;
   let commandBus: jest.Mocked<CommandBus>;

   beforeEach(async () => {
      const mockCommandBus = {
         execute: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
         controllers: [AuthGrpcController],
         providers: [
            {
               provide: CommandBus,
               useValue: mockCommandBus,
            },
         ],
      }).compile();

      controller = module.get<AuthGrpcController>(AuthGrpcController);
      commandBus = module.get<CommandBus>(CommandBus) as jest.Mocked<CommandBus>;
   });

   it('should be defined', () => {
      expect(controller).toBeDefined();
   });

   it('should have GrpcLoggingInterceptor and GrpcMetricsInterceptor applied', () => {
      const interceptors = Reflect.getMetadata('__interceptors__', AuthGrpcController);
      expect(interceptors).toBeDefined();
      expect(interceptors).toContain(GrpcLoggingInterceptor);
      expect(interceptors).toContain(GrpcMetricsInterceptor);
   });

   describe('checkEmail', () => {
      it('should execute CheckEmailCommand and return availability result', async () => {
         const expectedResponse = {
            available: true,
            email: 'user@example.com',
         };
         commandBus.execute.mockResolvedValue(expectedResponse);

         const result = await firstValueFrom(controller.checkEmail({ email: 'user@example.com' }));

         expect(commandBus.execute).toHaveBeenCalledWith(new CheckEmailCommand('user@example.com'));
         expect(result).toEqual(expectedResponse);
      });

      it('should propagate error if command execution fails', async () => {
         const error = new Error('Email validation failed');
         commandBus.execute.mockRejectedValue(error);

         await expect(firstValueFrom(controller.checkEmail({ email: 'invalid-email' }))).rejects.toThrow(error);
      });
   });
});
