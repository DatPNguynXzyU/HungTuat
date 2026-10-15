import { EventEmitter2 } from '@nestjs/event-emitter';
import { RedisService, UnauthorizedException } from '@common';
import { AUTH_ERROR_CODES, USER_STATUS } from '@contracts/auth';
import { AUTH_LOCKOUT_VALUE, AUTH_REDIS_TTL } from '@auth/constants';
import { AUTH_DOMAIN_EVENTS } from '@auth/domain/events';
import { AccountCanAuthenticateSpecification } from '@auth/domain/specifications';
import {
   LoginValidationPipeline,
   RateLimitHandler,
   LockoutHandler,
   AccountLookupHandler,
   PasswordVerificationHandler,
   AccountStatusHandler,
   type LoginValidationContext,
} from '@auth/chains/login-validation';
import type { AccountEntity } from '@auth/entities';

describe('LoginValidationPipeline & Chain Handlers', () => {
   const mockRateLimiter = {
      checkLogin: jest.fn().mockResolvedValue(undefined),
   };

   const mockRedisService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      ttl: jest.fn().mockResolvedValue(-2),
      incr: jest.fn().mockResolvedValue(1),
      expire: jest.fn(),
   } as unknown as RedisService;

   const mockAuditLogService = {
      record: jest.fn().mockResolvedValue(undefined),
   };

   const mockEventEmitter = {
      emit: jest.fn(),
   } as unknown as EventEmitter2;

   const mockAccountRepository = {
      findByEmail: jest.fn(),
      update: jest.fn(),
   };

   const mockPasswordHasher = {
      verify: jest.fn().mockResolvedValue(true),
   };

   const mockAccount: AccountEntity = {
      id: 'acc-123',
      email: 'user@example.com',
      passwordHash: 'hashed_pw',
      roles: ['USER'],
      status: USER_STATUS.ACTIVE,
      isEmailVerified: true,
      lastLoginAt: null,
      createdAt: '2026-10-10T00:00:00.000Z',
      updatedAt: '2026-10-10T00:00:00.000Z',
   };

   const createContext = (overrides?: Partial<LoginValidationContext>): LoginValidationContext => ({
      email: 'user@example.com',
      password: 'password123',
      clientIp: '127.0.0.1',
      lockoutKey: 'auth:lockout:user@example.com:127.0.0.1',
      failedAttemptsKey: 'auth:failed:user@example.com:127.0.0.1',
      ...overrides,
   });

   beforeEach(() => {
      jest.clearAllMocks();
      mockPasswordHasher.verify.mockResolvedValue(true);
      mockAccountRepository.findByEmail.mockResolvedValue(mockAccount);
      (mockRedisService.get as jest.Mock).mockResolvedValue(null);
      (mockRedisService.incr as jest.Mock).mockResolvedValue(1);
   });

   describe('RateLimitHandler', () => {
      it('should delegate to rateLimiter and call next handler', async () => {
         const handler = new RateLimitHandler(mockRateLimiter as never);
         const nextHandler = { handle: jest.fn().mockResolvedValue(undefined), setNext: jest.fn() };
         handler.setNext(nextHandler);

         const ctx = createContext();
         await handler.handle(ctx);

         expect(mockRateLimiter.checkLogin).toHaveBeenCalledWith('user@example.com', '127.0.0.1');
         expect(nextHandler.handle).toHaveBeenCalledWith(ctx);
      });

      it('should throw if rateLimiter rejects', async () => {
         mockRateLimiter.checkLogin.mockRejectedValueOnce(new Error('Rate limit exceeded'));
         const handler = new RateLimitHandler(mockRateLimiter as never);

         await expect(handler.handle(createContext())).rejects.toThrow('Rate limit exceeded');
      });
   });

   describe('LockoutHandler', () => {
      it('should allow flow when Redis key is not present', async () => {
         (mockRedisService.get as jest.Mock).mockResolvedValueOnce(null);
         const handler = new LockoutHandler(mockRedisService, mockAuditLogService as never, mockEventEmitter);
         const nextHandler = { handle: jest.fn().mockResolvedValue(undefined), setNext: jest.fn() };
         handler.setNext(nextHandler);

         const ctx = createContext();
         await handler.handle(ctx);

         expect(nextHandler.handle).toHaveBeenCalledWith(ctx);
      });

      it('should throw UnauthorizedException and record audit log if account is locked', async () => {
         (mockRedisService.get as jest.Mock).mockResolvedValueOnce(AUTH_LOCKOUT_VALUE);
         (mockRedisService.ttl as jest.Mock).mockResolvedValueOnce(300);

         const handler = new LockoutHandler(mockRedisService, mockAuditLogService as never, mockEventEmitter);
         const ctx = createContext();

         await expect(handler.handle(ctx)).rejects.toThrow(UnauthorizedException);
         expect(mockAuditLogService.record).toHaveBeenCalledWith(
            expect.objectContaining({
               reason: AUTH_ERROR_CODES.ACCOUNT_LOCKED_TEMPORARILY,
            }),
         );
         expect(mockEventEmitter.emit).toHaveBeenCalledWith(AUTH_DOMAIN_EVENTS.LOGIN_FAILED, expect.anything());
      });
   });

   describe('AccountLookupHandler', () => {
      it('should find account, attach to context and continue', async () => {
         const handler = new AccountLookupHandler(
            mockAccountRepository as never,
            mockRedisService,
            mockAuditLogService as never,
            mockEventEmitter,
         );
         const nextHandler = { handle: jest.fn().mockResolvedValue(undefined), setNext: jest.fn() };
         handler.setNext(nextHandler);

         const ctx = createContext();
         await handler.handle(ctx);

         expect(ctx.account).toEqual(mockAccount);
         expect(nextHandler.handle).toHaveBeenCalledWith(ctx);
      });

      it('should throw UnauthorizedException and track failed attempts if account not found', async () => {
         mockAccountRepository.findByEmail.mockResolvedValueOnce(null);
         const handler = new AccountLookupHandler(
            mockAccountRepository as never,
            mockRedisService,
            mockAuditLogService as never,
            mockEventEmitter,
         );

         const ctx = createContext();
         await expect(handler.handle(ctx)).rejects.toThrow(UnauthorizedException);
         expect(mockRedisService.incr).toHaveBeenCalledWith(ctx.failedAttemptsKey);
         expect(mockAuditLogService.record).toHaveBeenCalledWith(
            expect.objectContaining({ reason: AUTH_ERROR_CODES.INVALID_CREDENTIALS }),
         );
      });
   });

   describe('PasswordVerificationHandler', () => {
      it('should verify correct password and continue', async () => {
         const handler = new PasswordVerificationHandler(
            mockPasswordHasher as never,
            mockRedisService,
            mockAuditLogService as never,
            mockEventEmitter,
         );
         const nextHandler = { handle: jest.fn().mockResolvedValue(undefined), setNext: jest.fn() };
         handler.setNext(nextHandler);

         const ctx = createContext({ account: mockAccount });
         await handler.handle(ctx);

         expect(mockPasswordHasher.verify).toHaveBeenCalledWith(mockAccount.passwordHash, 'password123');
         expect(nextHandler.handle).toHaveBeenCalledWith(ctx);
      });

      it('should throw UnauthorizedException and track failed attempts if password is wrong', async () => {
         mockPasswordHasher.verify.mockResolvedValueOnce(false);
         const handler = new PasswordVerificationHandler(
            mockPasswordHasher as never,
            mockRedisService,
            mockAuditLogService as never,
            mockEventEmitter,
         );

         const ctx = createContext({ account: mockAccount });
         await expect(handler.handle(ctx)).rejects.toThrow(UnauthorizedException);
         expect(mockRedisService.incr).toHaveBeenCalledWith(ctx.failedAttemptsKey);
      });

      it('should lock account when failed attempts threshold is reached', async () => {
         mockPasswordHasher.verify.mockResolvedValueOnce(false);
         (mockRedisService.incr as jest.Mock).mockResolvedValueOnce(5);

         const handler = new PasswordVerificationHandler(
            mockPasswordHasher as never,
            mockRedisService,
            mockAuditLogService as never,
            mockEventEmitter,
         );

         const ctx = createContext({ account: mockAccount });
         await expect(handler.handle(ctx)).rejects.toThrow(UnauthorizedException);

         expect(mockRedisService.set).toHaveBeenCalledWith(
            ctx.lockoutKey,
            AUTH_LOCKOUT_VALUE,
            AUTH_REDIS_TTL.AUTH_LOCKOUT,
         );
         expect(mockRedisService.del).toHaveBeenCalledWith(ctx.failedAttemptsKey);
         expect(mockEventEmitter.emit).toHaveBeenCalledWith(AUTH_DOMAIN_EVENTS.ACCOUNT_LOCKED, expect.anything());
      });
   });

   describe('AccountStatusHandler', () => {
      it('should succeed when account status satisfies specification', async () => {
         const handler = new AccountStatusHandler(
            new AccountCanAuthenticateSpecification(),
            mockAuditLogService as never,
            mockEventEmitter,
         );
         const nextHandler = { handle: jest.fn().mockResolvedValue(undefined), setNext: jest.fn() };
         handler.setNext(nextHandler);

         const ctx = createContext({ account: mockAccount });
         await handler.handle(ctx);

         expect(nextHandler.handle).toHaveBeenCalledWith(ctx);
      });

      it('should throw UnauthorizedException when account is blocked', async () => {
         const handler = new AccountStatusHandler(
            new AccountCanAuthenticateSpecification(),
            mockAuditLogService as never,
            mockEventEmitter,
         );

         const blockedAccount = { ...mockAccount, status: USER_STATUS.BLOCKED };
         const ctx = createContext({ account: blockedAccount });

         await expect(handler.handle(ctx)).rejects.toThrow(UnauthorizedException);
         expect(mockAuditLogService.record).toHaveBeenCalledWith(
            expect.objectContaining({ reason: AUTH_ERROR_CODES.ACCOUNT_BLOCKED }),
         );
      });
   });

   describe('LoginValidationPipeline (Full Integration)', () => {
      it('should successfully run all handlers and return validated account', async () => {
         const pipeline = new LoginValidationPipeline([
            new RateLimitHandler(mockRateLimiter as never),
            new LockoutHandler(mockRedisService, mockAuditLogService as never, mockEventEmitter),
            new AccountLookupHandler(
               mockAccountRepository as never,
               mockRedisService,
               mockAuditLogService as never,
               mockEventEmitter,
            ),
            new PasswordVerificationHandler(
               mockPasswordHasher as never,
               mockRedisService,
               mockAuditLogService as never,
               mockEventEmitter,
            ),
            new AccountStatusHandler(
               new AccountCanAuthenticateSpecification(),
               mockAuditLogService as never,
               mockEventEmitter,
            ),
         ]);

         const ctx = createContext();
         const account = await pipeline.validate(ctx);

         expect(account).toEqual(mockAccount);
         expect(mockRateLimiter.checkLogin).toHaveBeenCalled();
         expect(mockPasswordHasher.verify).toHaveBeenCalled();
      });

      it('should fail fast at lockout handler before checking database or password', async () => {
         (mockRedisService.get as jest.Mock).mockResolvedValueOnce(AUTH_LOCKOUT_VALUE);

         const pipeline = new LoginValidationPipeline([
            new RateLimitHandler(mockRateLimiter as never),
            new LockoutHandler(mockRedisService, mockAuditLogService as never, mockEventEmitter),
            new AccountLookupHandler(
               mockAccountRepository as never,
               mockRedisService,
               mockAuditLogService as never,
               mockEventEmitter,
            ),
         ]);

         const ctx = createContext();
         await expect(pipeline.validate(ctx)).rejects.toThrow(UnauthorizedException);
         expect(mockAccountRepository.findByEmail).not.toHaveBeenCalled();
      });
   });
});
