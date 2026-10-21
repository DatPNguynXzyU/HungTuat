import { Test, TestingModule } from '@nestjs/testing';
import { DEFAULT_ROLES, RbacCacheService } from '@common';
import { RBAC_REPOSITORY } from '@auth/repositories';
import { AuthRbacService } from '@auth/services/domain/auth-rbac.service';

describe('AuthRbacService', () => {
   let service: AuthRbacService;

   const mockRbacRepository = {
      findRoleByCode: jest.fn(),
   };

   const mockRbacCacheService = {
      getRole: jest.fn(),
      setRole: jest.fn(),
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            AuthRbacService,
            {
               provide: RBAC_REPOSITORY,
               useValue: mockRbacRepository,
            },
            {
               provide: RbacCacheService,
               useValue: mockRbacCacheService,
            },
         ],
      }).compile();

      service = module.get<AuthRbacService>(AuthRbacService);
   });

   it('should be defined', () => {
      expect(service).toBeDefined();
   });

   describe('getOrCacheRole', () => {
      it('should return cached role if present in cache', async () => {
         const cachedRole = { id: 'role-1', code: DEFAULT_ROLES.USER, name: 'User', permissions: ['read'] };
         mockRbacCacheService.getRole.mockResolvedValueOnce(cachedRole);

         const result = await service.getOrCacheRole(DEFAULT_ROLES.USER);

         expect(result).toEqual(cachedRole);
         expect(mockRbacCacheService.getRole).toHaveBeenCalledWith(DEFAULT_ROLES.USER);
         expect(mockRbacRepository.findRoleByCode).not.toHaveBeenCalled();
      });

      it('should fetch from repository and cache role if not in cache', async () => {
         const repoRole = {
            id: 'role-1',
            code: DEFAULT_ROLES.USER,
            name: 'User',
            description: 'User role',
            permissions: ['read'],
         };
         mockRbacCacheService.getRole.mockResolvedValueOnce(null);
         mockRbacRepository.findRoleByCode.mockResolvedValueOnce(repoRole);

         const result = await service.getOrCacheRole(DEFAULT_ROLES.USER);

         expect(result).toEqual(repoRole);
         expect(mockRbacRepository.findRoleByCode).toHaveBeenCalledWith(DEFAULT_ROLES.USER);
         expect(mockRbacCacheService.setRole).toHaveBeenCalledWith(DEFAULT_ROLES.USER, {
            id: 'role-1',
            code: DEFAULT_ROLES.USER,
            name: 'User',
            description: 'User role',
            permissions: ['read'],
         });
      });

      it('should return null if role not found in repo', async () => {
         mockRbacCacheService.getRole.mockResolvedValueOnce(null);
         mockRbacRepository.findRoleByCode.mockResolvedValueOnce(null);

         const result = await service.getOrCacheRole('UNKNOWN');

         expect(result).toBeNull();
         expect(mockRbacCacheService.setRole).not.toHaveBeenCalled();
      });
   });

   describe('getRolePermissions', () => {
      it('should return role permissions', async () => {
         mockRbacCacheService.getRole.mockResolvedValueOnce({ id: 'r1', permissions: ['read:auth', 'write:auth'] });

         const permissions = await service.getRolePermissions(DEFAULT_ROLES.ADMIN);

         expect(permissions).toEqual(['read:auth', 'write:auth']);
      });

      it('should return empty array if role has no permissions or does not exist', async () => {
         mockRbacCacheService.getRole.mockResolvedValueOnce(null);
         mockRbacRepository.findRoleByCode.mockResolvedValueOnce(null);

         const permissions = await service.getRolePermissions('NON_EXISTENT');

         expect(permissions).toEqual([]);
      });
   });
});
