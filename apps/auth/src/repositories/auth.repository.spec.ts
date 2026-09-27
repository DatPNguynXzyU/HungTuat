import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@auth/prisma/prisma.service';
import { AuthRepository } from '@auth/repositories/auth.repository';

const UUID_V7_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('AuthRepository', () => {
   let repository: AuthRepository;
   let prismaService: {
      user: {
         findUnique: jest.Mock;
         create: jest.Mock;
         update: jest.Mock;
         delete: jest.Mock;
      };
      role: {
         findUnique: jest.Mock;
      };
      userRole: {
         upsert: jest.Mock;
      };
   };

   beforeEach(async () => {
      prismaService = {
         user: {
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
         },
         role: {
            findUnique: jest.fn(),
         },
         userRole: {
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

   it('should create a user with a valid UUIDv7 id', async () => {
      prismaService.user.create.mockImplementation(
         ({
            data,
         }: {
            data: { id: string; email: string; fullName: string; passwordHash: string; createdAt?: Date };
         }) =>
            Promise.resolve({
               id: data.id,
               email: data.email,
               fullName: data.fullName,
               passwordHash: data.passwordHash,
               createdAt: new Date('2026-09-27T00:00:00.000Z'),
               updatedAt: new Date('2026-09-27T00:00:00.000Z'),
            }),
      );

      const user = await repository.createUser({
         email: 'test@example.com',
         fullName: 'Test User',
         passwordHash: 'hashed_password',
      });

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(UUID_V7_REGEX.test(user.id)).toBe(true);
      expect(user.email).toBe('test@example.com');
      expect(user.fullName).toBe('Test User');
      expect(prismaService.user.create).toHaveBeenCalledTimes(1);
   });

   it('should find user by email with case-insensitivity', async () => {
      prismaService.user.findUnique.mockResolvedValue({
         id: 'test-id',
         email: 'user@example.com',
         fullName: 'User Example',
         passwordHash: 'hash',
         createdAt: new Date('2026-09-27T00:00:00.000Z'),
         updatedAt: new Date('2026-09-27T00:00:00.000Z'),
         userRoles: [
            {
               role: {
                  id: 'role-1',
                  code: 'USER',
                  name: 'User',
                  description: 'Standard user',
                  createdAt: new Date('2026-09-27T00:00:00.000Z'),
                  updatedAt: new Date('2026-09-27T00:00:00.000Z'),
               },
            },
         ],
      });

      const found = await repository.findByEmail('USER@EXAMPLE.COM');
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
         where: { email: 'user@example.com' },
         include: {
            userRoles: {
               include: {
                  role: true,
               },
            },
         },
      });
      expect(found).toBeDefined();
      expect(found?.email).toBe('user@example.com');
      expect(found?.roles).toEqual(['USER']);
   });

   it('should find user by id', async () => {
      prismaService.user.findUnique.mockResolvedValue({
         id: 'user-id-123',
         email: 'user2@example.com',
         fullName: 'User Two',
         passwordHash: 'hash',
         createdAt: new Date('2026-09-27T00:00:00.000Z'),
         updatedAt: new Date('2026-09-27T00:00:00.000Z'),
         userRoles: [],
      });

      const found = await repository.findById('user-id-123');
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
         where: { id: 'user-id-123' },
         include: {
            userRoles: {
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

   it('should find role by code with permissions', async () => {
      prismaService.role.findUnique.mockResolvedValue({
         id: 'role-user-id',
         code: 'USER',
         name: 'Standard User',
         description: 'Standard role',
         createdAt: new Date('2026-09-27T00:00:00.000Z'),
         updatedAt: new Date('2026-09-27T00:00:00.000Z'),
         rolePermissions: [
            {
               permission: {
                  id: 'perm-1',
                  code: 'USERS:READ',
                  name: 'Read Users',
                  description: null,
                  createdAt: new Date('2026-09-27T00:00:00.000Z'),
                  updatedAt: new Date('2026-09-27T00:00:00.000Z'),
               },
            },
         ],
      });

      const role = await repository.findRoleByCode('USER');
      expect(role).toBeDefined();
      expect(role?.code).toBe('USER');
      expect(role?.permissions).toEqual(['USERS:READ']);
   });
});
