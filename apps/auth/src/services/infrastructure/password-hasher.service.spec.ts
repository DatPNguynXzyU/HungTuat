import { Test, TestingModule } from '@nestjs/testing';
import { AuthConfigService } from '@auth/config';
import { PasswordHasherService } from './password-hasher.service';

describe('PasswordHasherService', () => {
   let service: PasswordHasherService;

   const mockConfig = {
      argon2Secret: 'test-pepper-secret-key-12345678',
   };

   beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
         providers: [
            PasswordHasherService,
            {
               provide: AuthConfigService,
               useValue: mockConfig,
            },
         ],
      }).compile();

      service = module.get<PasswordHasherService>(PasswordHasherService);
   });

   it('should be defined', () => {
      expect(service).toBeDefined();
   });

   it('should hash a password with argon2id and verify successfully', async () => {
      const password = 'StrongPassword123!';
      const hash = await service.hash(password);

      expect(hash).toContain('$argon2id$');

      const isValid = await service.verify(hash, password);
      expect(isValid).toBe(true);
   });

   it('should reject incorrect password', async () => {
      const password = 'StrongPassword123!';
      const hash = await service.hash(password);

      const isValid = await service.verify(hash, 'WrongPassword456!');
      expect(isValid).toBe(false);
   });

   it('should return false for malformed hash string without throwing', async () => {
      const isValid = await service.verify('invalid-hash-content', 'password');
      expect(isValid).toBe(false);
   });
});
