import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@auth/prisma/prisma.service';
import { AuthRepository } from '@auth/repositories/auth.repository';

const UUID_V7_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('AuthRepository', () => {
   let repository: AuthRepository;
   let prismaService: {
      $transaction: jest.Mock;
      account: {
         findFirst: jest.Mock;
         findUnique: jest.Mock;
         findMany: jest.Mock;
         create: jest.Mock;
         update: jest.Mock;
         delete: jest.Mock;
      };
      role: {
         findFirst: jest.Mock;
         findUnique: jest.Mock;
      };
      outboxEvent: {
         create: jest.Mock;
      };
      accountRole: {
         upsert: jest.Mock;
      };
   };

   beforeEach(async () => {
      prismaService = {
         $transaction: jest.fn().mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => cb(prismaService)),
         account: {
            findFirst: jest.fn(),
            findUnique: jest.fn(),
            findMany: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
         },
         role: {
            findFirst: jest.fn(),
            findUnique: jest.fn(),
         },
         outboxEvent: {
            create: jest.fn(),
         },
         accountRole: {
            upsert: jest.fn(),
         },
      };

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            AuthRepository,
            {
               provide: PrismaService,
               useValue: prismaService,
            },
         ],
      }).compile();

      repository = module.get<AuthRepository>(AuthRepository);
   });

   it('should be defined', () => {
      expect(repository).toBeDefined();
   });

   it('should create a user with a valid UUIDv7 id and enterprise defaults and optional outbox event in transaction', async () => {
      prismaService.account.create.mockImplementation(
         ({ data }: { data: { id: string; email: string; passwordHash: string; createdAt?: Date } }) =>
            Promise.resolve({
               id: data.id,
               email: data.email,
               passwordHash: data.passwordHash,
               status: 'ACTIVE',
               isEmailVerified: false,
               lastLoginAt: null,
               version: 1,
               deletedAt: null,
               createdAt: new Date('2026-09-27T00:00:00.000Z'),
               updatedAt: new Date('2026-09-27T00:00:00.000Z'),
            }),
      );
      prismaService.outboxEvent.create.mockResolvedValue({});

      const user = await repository.createAccount(
         {
            email: 'test@example.com',
            passwordHash: 'hashed_password',
         },
         {
            aggregateType: 'USER',
            eventType: 'USER_REGISTERED',
            payload: { email: 'test@example.com' },
         },
      );

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(UUID_V7_REGEX.test(user.id)).toBe(true);
      expect(user.email).toBe('test@example.com');
      expect(user.status).toBe('ACTIVE');
      expect(user.isEmailVerified).toBe(false);
      expect(user.version).toBe(1);
      expect(prismaService.account.create).toHaveBeenCalledTimes(1);
      expect(prismaService.outboxEvent.create).toHaveBeenCalledTimes(1);
   });

   it('should return list of all active user emails', async () => {
      prismaService.account.findMany.mockResolvedValue([
         { email: 'user1@example.com' },
         { email: 'user2@example.com' },
      ]);

      const emails = await repository.findAllEmails();

      expect(prismaService.account.findMany).toHaveBeenCalledWith({
         where: { deletedAt: null },
         select: { email: true },
      });
      expect(emails).toEqual(['user1@example.com', 'user2@example.com']);
   });

   it('should find user by email with case-insensitivity and deletedAt null check', async () => {
      prismaService.account.findFirst.mockResolvedValue({
         id: 'test-id',
         email: 'user@example.com',
         passwordHash: 'hash',
         status: 'ACTIVE',
         isEmailVerified: true,
         lastLoginAt: new Date('2026-09-27T01:00:00.000Z'),
         version: 1,
         deletedAt: null,
         createdAt: new Date('2026-09-27T00:00:00.000Z'),
         updatedAt: new Date('2026-09-27T00:00:00.000Z'),
         accountRoles: [
            {
               role: {
                  id: 'role-1',
                  code: 'USER',
                  name: 'User',
                  description: 'Standard user',
                  version: 1,
                  deletedAt: null,
                  createdAt: new Date('2026-09-27T00:00:00.000Z'),
                  updatedAt: new Date('2026-09-27T00:00:00.000Z'),
               },
            },
         ],
      });

      const found = await repository.findByEmail('USER@EXAMPLE.COM');
      expect(prismaService.account.findFirst).toHaveBeenCalledWith({
         where: {
            email: 'user@example.com',
            deletedAt: null,
         },
         include: {
            accountRoles: {
               include: {
                  role: true,
               },
            },
         },
      });
      expect(found).toBeDefined();
      expect(found?.email).toBe('user@example.com');
      expect(found?.status).toBe('ACTIVE');
      expect(found?.isEmailVerified).toBe(true);
      expect(found?.lastLoginAt).toBe('2026-09-27T01:00:00.000Z');
      expect(found?.roles).toEqual(['USER']);
   });

   it('should return null when finding user by email if user is soft deleted', async () => {
      prismaService.account.findFirst.mockResolvedValue(null);

      const found = await repository.findByEmail('deleted@example.com');
      expect(prismaService.account.findFirst).toHaveBeenCalledWith({
         where: {
            email: 'deleted@example.com',
            deletedAt: null,
         },
         include: {
            accountRoles: {
               include: {
                  role: true,
               },
            },
         },
      });
      expect(found).toBeNull();
   });

   it('should find user by id filtering deletedAt null', async () => {
      prismaService.account.findFirst.mockResolvedValue({
         id: 'user-id-123',
         email: 'user2@example.com',
         passwordHash: 'hash',
         status: 'ACTIVE',
         isEmailVerified: false,
         lastLoginAt: null,
         version: 1,
         deletedAt: null,
         createdAt: new Date('2026-09-27T00:00:00.000Z'),
         updatedAt: new Date('2026-09-27T00:00:00.000Z'),
         accountRoles: [],
      });

      const found = await repository.findById('user-id-123');
      expect(prismaService.account.findFirst).toHaveBeenCalledWith({
         where: {
            id: 'user-id-123',
            deletedAt: null,
         },
         include: {
            accountRoles: {
               include: {
                  role: true,
               },
            },
         },
      });
      expect(found).toBeDefined();
      expect(found?.id).toBe('user-id-123');
      expect(found?.roles).toEqual([]);
   });

   it('should return null when finding user by id if user is soft deleted', async () => {
      prismaService.account.findFirst.mockResolvedValue(null);

      const found = await repository.findById('deleted-id');
      expect(prismaService.account.findFirst).toHaveBeenCalledWith({
         where: {
            id: 'deleted-id',
            deletedAt: null,
         },
         include: {
            accountRoles: {
               include: {
                  role: true,
               },
            },
         },
      });
      expect(found).toBeNull();
   });

   it('should find role by code with permissions and deletedAt null', async () => {
      prismaService.role.findFirst.mockResolvedValue({
         id: 'role-user-id',
         code: 'USER',
         name: 'Standard User',
         description: 'Standard role',
         version: 1,
         deletedAt: null,
         createdAt: new Date('2026-09-27T00:00:00.000Z'),
         updatedAt: new Date('2026-09-27T00:00:00.000Z'),
         rolePermissions: [
            {
               permission: {
                  id: 'perm-1',
                  code: 'USERS:READ',
                  name: 'Read Users',
                  description: null,
                  version: 1,
                  deletedAt: null,
                  createdAt: new Date('2026-09-27T00:00:00.000Z'),
                  updatedAt: new Date('2026-09-27T00:00:00.000Z'),
               },
            },
         ],
      });

      const role = await repository.findRoleByCode('USER');
      expect(prismaService.role.findFirst).toHaveBeenCalledWith({
         where: {
            code: 'USER',
            deletedAt: null,
         },
         include: {
            rolePermissions: {
               include: {
                  permission: true,
               },
            },
         },
      });
      expect(role).toBeDefined();
      expect(role?.code).toBe('USER');
      expect(role?.version).toBe(1);
      expect(role?.permissions).toEqual(['USERS:READ']);
   });
});
