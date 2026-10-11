import { Test, TestingModule } from '@nestjs/testing';
import { RmqContext } from '@nestjs/microservices';
import { of } from 'rxjs';
import {
   BloomFilterService,
   DEFAULT_DEV_RSA_PRIVATE_KEY,
   DEFAULT_DEV_RSA_PUBLIC_KEY,
   DEFAULT_JWT_KEY_ID,
   DEFAULT_ROLES,
   RbacCacheService,
   RedisService,
   RmqService,
   SERVICES,
} from '@common';
import { AuthController } from '@auth/auth.controller';
import { AuthService } from '@auth/auth.service';
import { AuthConfigService } from '@auth/config';
import { OutboxPublisherService } from '@auth/outbox/services/outbox-publisher.service';
import { PrismaService } from '@auth/prisma/prisma.service';
import {
   AUDIT_LOG_REPOSITORY,
   AuditLogRepository,
   AUTH_REPOSITORY,
   AuthRepository,
   SESSION_REPOSITORY,
   SessionRepository,
} from '@auth/repositories';
import { AuditLogService } from '@auth/services/audit-log.service';
import { EmailBloomFilterService } from '@auth/services/email-bloom-filter.service';
import { TokenService } from '@auth/services/token.service';
import { TOKEN_SERVICE } from '@auth/services/token.service.interface';

interface MockUserRecord {
   accountId: string;
   email: string;
   passwordHash: string;
   createdAt: Date;
   updatedAt: Date;
   accountRoles?: Array<{
      role: {
         id: string;
         code: string;
         name: string;
         description: string | null;
      };
   }>;
}

describe('AuthController', () => {
   let authController: AuthController;
   let authService: AuthService;

   beforeEach(async () => {
      const usersMap = new Map<string, MockUserRecord>();
      const mockPrisma: Record<string, unknown> = {
         $transaction: jest.fn().mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => cb(mockPrisma)),
         outboxEvent: {
            create: jest.fn().mockResolvedValue({}),
         },
         securityAuditLog: {
            create: jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
               Promise.resolve({
                  id: 'audit-id-1',
                  ...data,
                  createdAt: new Date(),
               }),
            ),
            findUnique: jest.fn().mockResolvedValue(null),
            findMany: jest.fn().mockResolvedValue([]),
            count: jest.fn().mockResolvedValue(0),
         },
         accountSession: {
            create: jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
               Promise.resolve({
                  id: 'session-id-1',
                  ...data,
                  isRevoked: false,
                  lastActiveAt: new Date(),
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  expiresAt: new Date(Date.now() + 604800000),
               }),
            ),
            findUnique: jest.fn().mockResolvedValue(null),
            findFirst: jest.fn().mockResolvedValue(null),
            findMany: jest.fn().mockResolvedValue([]),
            update: jest.fn().mockResolvedValue({}),
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
         },
         accountRole: {
            upsert: jest.fn().mockResolvedValue({}),
         },
         account: {
            findFirst: jest
               .fn()
               .mockImplementation(
                  ({ where }: { where: { email?: string; accountId?: string; deletedAt?: unknown } }) => {
                     if (where.email) {
                        for (const u of usersMap.values()) {
                           if (u.email === where.email) return Promise.resolve(u);
                        }
                     }
                     if (where.accountId) {
                        return Promise.resolve(usersMap.get(where.accountId) || null);
                     }
                     return Promise.resolve(null);
                  },
               ),
            findUnique: jest.fn().mockImplementation(({ where }: { where: { email?: string; accountId?: string } }) => {
               if (where.email) {
                  for (const u of usersMap.values()) {
                     if (u.email === where.email) return Promise.resolve(u);
                  }
               }
               if (where.accountId) {
                  return Promise.resolve(usersMap.get(where.accountId) || null);
               }
               return Promise.resolve(null);
            }),
            findMany: jest.fn().mockImplementation(({ select }: { select?: { email?: boolean } }) => {
               if (select?.email) {
                  return Promise.resolve(Array.from(usersMap.values()).map((u) => ({ email: u.email })));
               }
               return Promise.resolve(Array.from(usersMap.values()));
            }),
            create: jest
               .fn()
               .mockImplementation(
                  ({
                     data,
                  }: {
                     data: { accountId: string; email: string; passwordHash: string; createdAt?: Date };
                  }) => {
                     const record: MockUserRecord = {
                        accountId: data.accountId,
                        email: data.email,
                        passwordHash: data.passwordHash,
                        createdAt: data.createdAt || new Date(),
                        updatedAt: new Date(),
                        accountRoles: [
                           {
                              role: {
                                 id: 'role-user-id',
                                 code: DEFAULT_ROLES.USER,
                                 name: 'Standard User',
                                 description: null,
                              },
                           },
                        ],
                     };
                     usersMap.set(data.accountId, record);
                     return Promise.resolve(record);
                  },
               ),
            update: jest
               .fn()
               .mockImplementation(
                  ({
                     where,
                     data,
                  }: {
                     where: { accountId: string };
                     data: Partial<{ email: string; passwordHash: string }>;
                  }) => {
                     const existing = usersMap.get(where.accountId);
                     if (!existing) return Promise.reject(new Error('Not found'));
                     const updated: MockUserRecord = { ...existing, ...data, updatedAt: new Date() };
                     usersMap.set(where.accountId, updated);
                     return Promise.resolve(updated);
                  },
               ),
            delete: jest.fn().mockImplementation(({ where }: { where: { accountId: string } }) => {
               usersMap.delete(where.accountId);
               return Promise.resolve({});
            }),
         },
         role: {
            findFirst: jest.fn().mockResolvedValue({
               id: 'role-user-id',
               code: DEFAULT_ROLES.USER,
               name: 'Standard User',
               description: null,
               rolePermissions: [
                  {
                     permission: {
                        id: 'perm-1',
                        code: 'USERS:READ',
                        name: 'Read Users',
                        description: null,
                     },
                  },
               ],
            }),
            findUnique: jest.fn().mockResolvedValue({
               id: 'role-user-id',
               code: DEFAULT_ROLES.USER,
               name: 'Standard User',
               description: null,
               rolePermissions: [
                  {
                     permission: {
                        id: 'perm-1',
                        code: 'USERS:READ',
                        name: 'Read Users',
                        description: null,
                     },
                  },
               ],
            }),
         },
      };

      const mockRbacCacheService = {
         getRole: jest.fn().mockResolvedValue({
            id: 'role-user-id',
            code: DEFAULT_ROLES.USER,
            name: 'Standard User',
            permissions: ['USERS:READ'],
         }),
         setRole: jest.fn().mockResolvedValue(undefined),
         getRolePermissions: jest.fn().mockResolvedValue(['USERS:READ']),
         setRolePermissions: jest.fn().mockResolvedValue(undefined),
         invalidateRole: jest.fn().mockResolvedValue(undefined),
      };

      const redisStorage = new Map<string, string>();
      const redisSets = new Map<string, Set<string>>();

      const mockRedisService = {
         getClient: jest.fn().mockReturnValue(null),
         get: jest.fn().mockImplementation((key: string) => Promise.resolve(redisStorage.get(key) || null)),
         set: jest.fn().mockImplementation((key: string, value: string) => {
            redisStorage.set(key, value);
            return Promise.resolve();
         }),
         del: jest.fn().mockImplementation((key: string) => {
            redisStorage.delete(key);
            redisSets.delete(key);
            return Promise.resolve(1);
         }),
         incr: jest.fn().mockImplementation((key: string) => {
            const current = Number(redisStorage.get(key) || 0) + 1;
            redisStorage.set(key, String(current));
            return Promise.resolve(current);
         }),
         ttl: jest.fn().mockImplementation((key: string) => {
            return Promise.resolve(redisStorage.has(key) ? 900 : -2);
         }),
         sadd: jest.fn().mockImplementation((key: string, ...members: string[]) => {
            if (!redisSets.has(key)) redisSets.set(key, new Set());
            const set = redisSets.get(key)!;
            members.forEach((m) => set.add(m));
            return Promise.resolve();
         }),
         srem: jest.fn().mockImplementation((key: string, ...members: string[]) => {
            const set = redisSets.get(key);
            if (set) {
               members.forEach((m) => set.delete(m));
            }
            return Promise.resolve();
         }),
         smembers: jest.fn().mockImplementation((key: string) => {
            const set = redisSets.get(key);
            return Promise.resolve(set ? Array.from(set) : []);
         }),
         expire: jest.fn().mockResolvedValue(undefined),
         deleteByPattern: jest.fn().mockImplementation((pattern: string) => {
            let deleted = 0;
            const prefix = pattern.replace('*', '');
            for (const key of redisStorage.keys()) {
               if (key.startsWith(prefix)) {
                  redisStorage.delete(key);
                  deleted++;
               }
            }
            return Promise.resolve(deleted);
         }),
         getJson: jest.fn().mockImplementation((key: string) => {
            const raw = redisStorage.get(key);
            return Promise.resolve(raw ? JSON.parse(raw) : null);
         }),
         setJson: jest.fn().mockImplementation((key: string, value: unknown) => {
            redisStorage.set(key, JSON.stringify(value));
            return Promise.resolve();
         }),
      };

      const mockNotificationClient = {
         emit: jest.fn().mockReturnValue(of(true)),
         send: jest.fn().mockReturnValue(of(true)),
      };

      const mockOutboxPublisherService = {
         triggerPublish: jest.fn(),
         publishPendingEvents: jest.fn().mockResolvedValue(0),
      };

      const module: TestingModule = await Test.createTestingModule({
         controllers: [AuthController],
         providers: [
            TokenService,
            {
               provide: TOKEN_SERVICE,
               useExisting: TokenService,
            },
            AuthService,
            AuditLogService,
            EmailBloomFilterService,
            BloomFilterService,
            {
               provide: AUTH_REPOSITORY,
               useClass: AuthRepository,
            },
            {
               provide: SESSION_REPOSITORY,
               useClass: SessionRepository,
            },
            {
               provide: AUDIT_LOG_REPOSITORY,
               useClass: AuditLogRepository,
            },
            {
               provide: OutboxPublisherService,
               useValue: mockOutboxPublisherService,
            },
            {
               provide: SERVICES.NOTIFICATION_SERVICE,
               useValue: mockNotificationClient,
            },
            {
               provide: PrismaService,
               useValue: mockPrisma,
            },
            {
               provide: AuthConfigService,
               useValue: {
                  jwtPrivateKey: DEFAULT_DEV_RSA_PRIVATE_KEY,
                  jwtPublicKey: DEFAULT_DEV_RSA_PUBLIC_KEY,
                  jwtKeyId: DEFAULT_JWT_KEY_ID,
                  jwtAccessTokenExpiresIn: 900,
                  jwtRefreshTokenExpiresIn: 604800,
                  jwtExpiresIn: 86400,
               },
            },
            {
               provide: RmqService,
               useValue: {
                  ack: jest.fn(),
               },
            },
            {
               provide: RbacCacheService,
               useValue: mockRbacCacheService,
            },
            {
               provide: RedisService,
               useValue: mockRedisService,
            },
         ],
      }).compile();

      authController = module.get<AuthController>(AuthController);
      authService = module.get<AuthService>(AuthService);
   });

   it('should be defined', () => {
      expect(authController).toBeDefined();
      expect(authService).toBeDefined();
   });

   it('should handle getJwks message', () => {
      const mockContext = {
         getChannelRef: jest.fn(),
         getMessage: jest.fn(),
      } as unknown as RmqContext;

      const jwks = authController.getJwks(mockContext);
      expect(jwks).toBeDefined();
      expect(Array.isArray(jwks.keys)).toBe(true);
      expect(jwks.keys[0].kty).toBe('RSA');
      expect(jwks.keys[0].alg).toBe('RS256');
   });

   it('should handle checkEmail message pattern', async () => {
      const mockContext = {
         getChannelRef: jest.fn(),
         getMessage: jest.fn(),
      } as unknown as RmqContext;

      const checkRes = await authController.checkEmail({ email: 'newemail@example.com' }, mockContext);
      expect(checkRes).toEqual({ available: true, email: 'newemail@example.com' });
   });

   it('should handle sendRegisterOtp and verifyRegisterOtp message pattern', async () => {
      const mockContext = {
         getChannelRef: jest.fn(),
         getMessage: jest.fn(),
      } as unknown as RmqContext;

      const sendOtpRes = await authController.sendRegisterOtp({ email: 'otpuser@example.com' }, mockContext);
      expect(sendOtpRes.success).toBe(true);
      expect(sendOtpRes.cooldownSeconds).toBe(60);

      // Verify OTP after retrieving from Redis
      const otpKey = `auth:otp:register:otpuser@example.com`;
      const otp = await authService['redisService'].get(otpKey);
      expect(otp).toBeDefined();

      const verifyRes = await authController.verifyRegisterOtp(
         { email: 'otpuser@example.com', otp: otp as string },
         mockContext,
      );
      expect(verifyRes.success).toBe(true);
      expect(verifyRes.verificationToken).toBeDefined();
   });

   it('should register and login a user successfully', async () => {
      const mockContext = {
         getChannelRef: jest.fn(),
         getMessage: jest.fn(),
      } as unknown as RmqContext;

      const registerDto = {
         email: 'test@example.com',
         password: 'password123',
         confirmPassword: 'password123',
      };

      const registerRes = await authController.register(registerDto, mockContext);

      expect(registerRes.user.email).toBe('test@example.com');
      expect(registerRes.accessToken).toBeDefined();
      expect(registerRes.refreshToken).toBeDefined();

      const loginRes = await authController.login({ email: 'test@example.com', password: 'password123' }, mockContext);

      expect(loginRes.user.email).toBe('test@example.com');
      expect(loginRes.accessToken).toBeDefined();
      expect(loginRes.refreshToken).toBeDefined();
   });

   it('should handle refreshToken message', async () => {
      const mockContext = {
         getChannelRef: jest.fn(),
         getMessage: jest.fn(),
      } as unknown as RmqContext;

      const registerRes = await authController.register(
         { email: 'refresh@example.com', password: 'password123', confirmPassword: 'password123' },
         mockContext,
      );

      const refreshRes = await authController.refreshToken({ refreshToken: registerRes.refreshToken }, mockContext);

      expect(refreshRes.accessToken).toBeDefined();
      expect(refreshRes.refreshToken).toBeDefined();
   });

   it('should handle getSessions message', async () => {
      const mockContext = {
         getChannelRef: jest.fn(),
         getMessage: jest.fn(),
      } as unknown as RmqContext;

      const sessions = await authController.getSessions({ userId: 'user-1' }, mockContext);
      expect(Array.isArray(sessions)).toBe(true);
   });

   it('should handle revokeSession message', async () => {
      const mockContext = {
         getChannelRef: jest.fn(),
         getMessage: jest.fn(),
      } as unknown as RmqContext;

      const result = await authController.revokeOtherSessions({ userId: 'user-1', currentJti: 'jti-1' }, mockContext);
      expect(result.revokedCount).toBeDefined();
   });

   it('should handle getAuditLogs message with admin role', async () => {
      const mockContext = {
         getChannelRef: jest.fn(),
         getMessage: jest.fn(),
      } as unknown as RmqContext;

      const logs = await authController.getAuditLogs(
         {
            data: { page: 1, limit: 10 },
            user: {
               userId: 'admin-1',
               email: 'admin@example.com',
               roles: [DEFAULT_ROLES.ADMIN],
               permissions: [],
            },
         },
         mockContext,
      );
      expect(logs).toBeDefined();
      expect(logs.data).toEqual([]);
   });

   it('should handle revokeToken message and return success', async () => {
      const mockContext = {
         getChannelRef: jest.fn(),
         getMessage: jest.fn(),
      } as unknown as RmqContext;

      jest.spyOn(authService, 'revokeToken').mockResolvedValue(undefined);

      const result = await authController.revokeToken({ token: 'test-token' }, mockContext);
      expect(result).toEqual({ success: true });
   });

   it('should handle revokeSession message and return success', async () => {
      const mockContext = {
         getChannelRef: jest.fn(),
         getMessage: jest.fn(),
      } as unknown as RmqContext;

      jest.spyOn(authService, 'revokeSession').mockResolvedValue(undefined);

      const result = await authController.revokeSession({ userId: 'user-1', sessionId: 'sess-1' }, mockContext);
      expect(result).toEqual({ success: true });
   });

   it('should reject getAuditLogs without admin role', async () => {
      const mockContext = {
         getChannelRef: jest.fn(),
         getMessage: jest.fn(),
      } as unknown as RmqContext;

      await expect(
         authController.getAuditLogs(
            {
               data: { page: 1, limit: 10 },
               user: {
                  userId: 'user-1',
                  email: 'user@example.com',
                  roles: [DEFAULT_ROLES.USER],
                  permissions: [],
               },
            },
            mockContext,
         ),
      ).rejects.toThrow();
   });

   it('should handle getEmail message and return user email', async () => {
      const mockContext = {
         getChannelRef: jest.fn(),
         getMessage: jest.fn(),
      } as unknown as RmqContext;

      jest.spyOn(authService, 'getEmail').mockResolvedValue({
         id: 'account-123',
         email: 'test@example.com',
         isEmailVerified: true,
      });

      const result = await authController.getEmail({ accountId: 'account-123' }, mockContext);
      expect(result).toEqual({
         id: 'account-123',
         email: 'test@example.com',
         isEmailVerified: true,
      });
   });

   it('should throw BadRequestException when accountId is missing in getEmail', async () => {
      const mockContext = {
         getChannelRef: jest.fn(),
         getMessage: jest.fn(),
      } as unknown as RmqContext;

      await expect(authController.getEmail({ accountId: '' }, mockContext)).rejects.toThrow();
   });
});
