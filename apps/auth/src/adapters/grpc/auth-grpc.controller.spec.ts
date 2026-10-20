import { Test, TestingModule } from '@nestjs/testing';
import { firstValueFrom } from 'rxjs';
import { CommandBus, DEFAULT_ROLES, GrpcLoggingInterceptor, GrpcMetricsInterceptor } from '@common';
import { USER_STATUS } from '@contracts/auth';
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

   describe('login', () => {
      it('should execute LoginCommand and return formatted login response', async () => {
         const mockAuthResult = {
            user: {
               id: 'user-uuid-1',
               email: 'user@example.com',
               roles: [DEFAULT_ROLES.USER],
               status: USER_STATUS.ACTIVE,
               isEmailVerified: true,
               lastLoginAt: '2026-10-20T10:00:00.000Z',
               createdAt: '2026-01-01T00:00:00.000Z',
               updatedAt: '2026-10-20T10:00:00.000Z',
            },
            accessToken: 'access-token-xyz',
            refreshToken: 'refresh-token-xyz',
            tokens: {
               accessToken: 'access-token-xyz',
               refreshToken: 'refresh-token-xyz',
               tokenType: 'Bearer' as const,
               expiresIn: 3600,
            },
         };
         commandBus.execute.mockResolvedValue(mockAuthResult);

         const result = await firstValueFrom(
            controller.login({
               email: 'user@example.com',
               password: 'Password123!',
               deviceInfo: {
                  browser: 'Chrome',
                  ipAddress: '127.0.0.1',
               },
            }),
         );

         expect(commandBus.execute).toHaveBeenCalled();
         expect(result.accessToken).toBe('access-token-xyz');
         expect(result.refreshToken).toBe('refresh-token-xyz');
         expect(result.user.email).toBe('user@example.com');
         expect(result.tokens?.expiresIn).toBe(3600);
      });

      it('should handle login without deviceInfo and without tokens', async () => {
         const mockAuthResult = {
            user: {
               id: 'user-uuid-2',
               email: 'notokens@example.com',
               roles: [DEFAULT_ROLES.USER],
               createdAt: '2026-01-01T00:00:00.000Z',
            },
            accessToken: 'access-token-abc',
            refreshToken: 'refresh-token-abc',
         };
         commandBus.execute.mockResolvedValue(mockAuthResult);

         const result = await firstValueFrom(
            controller.login({
               email: 'notokens@example.com',
               password: 'Password123!',
            }),
         );

         expect(result.user.email).toBe('notokens@example.com');
         expect(result.tokens).toBeUndefined();
         expect(result.user.lastLoginAt).toBe('');
      });

      it('should propagate error if login command execution fails', async () => {
         const error = new Error('Invalid credentials');
         commandBus.execute.mockRejectedValue(error);

         await expect(
            firstValueFrom(
               controller.login({
                  email: 'wrong@example.com',
                  password: 'WrongPassword!',
               }),
            ),
         ).rejects.toThrow(error);
      });
   });

   describe('refreshToken', () => {
      it('should execute RefreshTokenCommand and return formatted refresh response', async () => {
         const mockAuthResult = {
            user: {
               id: 'user-uuid-1',
               email: 'user@example.com',
               roles: [DEFAULT_ROLES.USER],
               status: USER_STATUS.ACTIVE,
               isEmailVerified: true,
               lastLoginAt: '2026-10-20T10:00:00.000Z',
               createdAt: '2026-01-01T00:00:00.000Z',
               updatedAt: '2026-10-20T10:00:00.000Z',
            },
            accessToken: 'new-access-token-xyz',
            refreshToken: 'new-refresh-token-xyz',
            tokens: {
               accessToken: 'new-access-token-xyz',
               refreshToken: 'new-refresh-token-xyz',
               tokenType: 'Bearer' as const,
               expiresIn: 3600,
            },
         };
         commandBus.execute.mockResolvedValue(mockAuthResult);

         const result = await firstValueFrom(
            controller.refreshToken({
               refreshToken: 'valid-refresh-token',
               deviceInfo: {
                  browser: 'Firefox',
                  ipAddress: '192.168.1.1',
               },
            }),
         );

         expect(commandBus.execute).toHaveBeenCalled();
         expect(result.accessToken).toBe('new-access-token-xyz');
         expect(result.refreshToken).toBe('new-refresh-token-xyz');
         expect(result.user.email).toBe('user@example.com');
         expect(result.tokens?.expiresIn).toBe(3600);
      });

      it('should propagate error if refresh token command execution fails', async () => {
         const error = new Error('Invalid refresh token');
         commandBus.execute.mockRejectedValue(error);

         await expect(
            firstValueFrom(
               controller.refreshToken({
                  refreshToken: 'invalid-refresh-token',
               }),
            ),
         ).rejects.toThrow(error);
      });
   });
});
