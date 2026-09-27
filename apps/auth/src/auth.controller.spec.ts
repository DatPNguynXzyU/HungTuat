import { Test, TestingModule } from '@nestjs/testing';
import { RmqContext } from '@nestjs/microservices';
import { of } from 'rxjs';
import { DEFAULT_ROLES, RbacCacheService, RedisService, RmqService, SERVICES } from '@common';
import { AuthController } from '@auth/auth.controller';
import { AuthService } from '@auth/auth.service';
import { AuthConfigService } from '@auth/config';
import { PrismaService } from '@auth/prisma/prisma.service';
import { AUTH_REPOSITORY, AuthRepository } from '@auth/repositories';
import { TokenService } from '@auth/services/token.service';

interface MockUserRecord {
   id: string;
   email: string;
   fullName: string;
   passwordHash: string;
   createdAt: Date;
   updatedAt: Date;
   userRoles?: Array<{
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
      const mockPrisma = {
         user: {
            findUnique: jest.fn().mockImplementation(({ where }: { where: { email?: string; id?: string } }) => {
               if (where.email) {
                  for (const u of usersMap.values()) {
                     if (u.email === where.email) return Promise.resolve(u);
                  }
               }
               if (where.id) {
                  return Promise.resolve(usersMap.get(where.id) || null);
               }
               return Promise.resolve(null);
            }),
            create: jest
               .fn()
               .mockImplementation(
                  ({
                     data,
                  }: {
                     data: { id: string; email: string; fullName: string; passwordHash: string; createdAt?: Date };
                  }) => {
                     const record: MockUserRecord = {
                        id: data.id,
                        email: data.email,
                        fullName: data.fullName,
                        passwordHash: data.passwordHash,
                        createdAt: data.createdAt || new Date(),
                        updatedAt: new Date(),
                        userRoles: [
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
                     usersMap.set(data.id, record);
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
                     where: { id: string };
                     data: Partial<{ email: string; fullName: string; passwordHash: string }>;
                  }) => {
                     const existing = usersMap.get(where.id);
                     if (!existing) return Promise.reject(new Error('Not found'));
                     const updated: MockUserRecord = { ...existing, ...data, updatedAt: new Date() };
                     usersMap.set(where.id, updated);
                     return Promise.resolve(updated);
                  },
               ),
            delete: jest.fn().mockImplementation(({ where }: { where: { id: string } }) => {
               usersMap.delete(where.id);
               return Promise.resolve({});
            }),
         },
         role: {
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

      const module: TestingModule = await Test.createTestingModule({
         controllers: [AuthController],
         providers: [
            TokenService,
            AuthService,
            {
               provide: AUTH_REPOSITORY,
               useClass: AuthRepository,
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
                  jwtSecret: 'test-secret-key',
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

   it('should register and login a user successfully', async () => {
      const mockContext = {
         getChannelRef: jest.fn(),
         getMessage: jest.fn(),
      } as unknown as RmqContext;

      const registerDto = {
         email: 'test@example.com',
         password: 'password123',
         fullName: 'Test User',
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
         { email: 'refresh@example.com', password: 'password123', fullName: 'Refresh User' },
         mockContext,
      );

      const refreshRes = await authController.refreshToken({ refreshToken: registerRes.refreshToken }, mockContext);

      expect(refreshRes.accessToken).toBeDefined();
      expect(refreshRes.refreshToken).toBeDefined();
   });

   it('should handle revokeToken message', async () => {
      const mockContext = {
         getChannelRef: jest.fn(),
         getMessage: jest.fn(),
      } as unknown as RmqContext;

      const registerRes = await authController.register(
         { email: 'revoke@example.com', password: 'password123', fullName: 'Revoke User' },
         mockContext,
      );

      const revokeRes = await authController.revokeToken({ token: registerRes.refreshToken }, mockContext);
      expect(revokeRes.success).toBe(true);
   });

   it('should handle revokeAllUserTokens message', async () => {
      const mockContext = {
         getChannelRef: jest.fn(),
         getMessage: jest.fn(),
      } as unknown as RmqContext;

      const res = await authController.revokeAllUserTokens({ userId: 'user-id-to-revoke-all' }, mockContext);
      expect(res.success).toBe(true);
      expect(res.message).toBe('All tokens revoked successfully');
   });

   it('should handle logoutAll message', async () => {
      const mockContext = {
         getChannelRef: jest.fn(),
         getMessage: jest.fn(),
      } as unknown as RmqContext;

      const res = await authController.logoutAll({ userId: 'user-id-to-logout-all' }, mockContext);
      expect(res.success).toBe(true);
      expect(res.message).toBe('All sessions logged out successfully');
   });

   it('should handle changePassword message', async () => {
      const mockContext = {
         getChannelRef: jest.fn(),
         getMessage: jest.fn(),
      } as unknown as RmqContext;

      const registerRes = await authController.register(
         { email: 'changepass@example.com', password: 'oldPassword123', fullName: 'Pass User' },
         mockContext,
      );

      const res = await authController.changePassword(
         {
            userId: registerRes.user.id,
            changePasswordDto: { currentPassword: 'oldPassword123', newPassword: 'newPassword123' },
         },
         mockContext,
      );

      expect(res.success).toBe(true);
   });

   it('should handle getRolePermissions message', async () => {
      const mockContext = {
         getChannelRef: jest.fn(),
         getMessage: jest.fn(),
      } as unknown as RmqContext;

      const perms = await authController.getRolePermissions({ roleCode: DEFAULT_ROLES.USER }, mockContext);
      expect(perms).toEqual(['USERS:READ']);
   });
});
