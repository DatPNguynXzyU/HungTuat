import { Test, type TestingModule } from '@nestjs/testing';
import { RedisService } from '@common';
import { AUTH_REDIS_TTL, AuthRedisKeys } from '@auth/constants';
import {
   VERIFICATION_TOKEN_PREFIX,
   VerificationTokenService,
} from '@auth/services/infrastructure/verification-token.service';

describe('VerificationTokenService', () => {
   let service: VerificationTokenService;

   const mockRedisService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
   };

   beforeEach(async () => {
      jest.clearAllMocks();

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            VerificationTokenService,
            {
               provide: RedisService,
               useValue: mockRedisService,
            },
         ],
      }).compile();

      service = module.get<VerificationTokenService>(VerificationTokenService);
   });

   describe('generate', () => {
      it('should generate verification token with correct prefix and store in Redis', async () => {
         mockRedisService.set.mockResolvedValue('OK');

         const email = 'user@example.com';
         const token = await service.generate(email);

         expect(token).toMatch(new RegExp(`^${VERIFICATION_TOKEN_PREFIX}[a-f0-9]{32}$`));
         expect(mockRedisService.set).toHaveBeenCalledWith(
            AuthRedisKeys.verificationToken(token),
            email,
            AUTH_REDIS_TTL.OTP_VERIFICATION_TOKEN,
         );
      });

      it('should accept custom ttl parameter', async () => {
         mockRedisService.set.mockResolvedValue('OK');

         const email = 'user@example.com';
         const customTtl = 600;
         const token = await service.generate(email, customTtl);

         expect(mockRedisService.set).toHaveBeenCalledWith(AuthRedisKeys.verificationToken(token), email, customTtl);
      });
   });

   describe('validate', () => {
      it('should return email when token exists in Redis', async () => {
         const token = `${VERIFICATION_TOKEN_PREFIX}abc12345`;
         mockRedisService.get.mockResolvedValue('user@example.com');

         const result = await service.validate(token);
         expect(result).toBe('user@example.com');
         expect(mockRedisService.get).toHaveBeenCalledWith(AuthRedisKeys.verificationToken(token));
      });

      it('should return null when token does not exist or expired', async () => {
         const token = `${VERIFICATION_TOKEN_PREFIX}notfound`;
         mockRedisService.get.mockResolvedValue(null);

         const result = await service.validate(token);
         expect(result).toBeNull();
      });
   });

   describe('consume', () => {
      it('should return email and delete key when token is valid', async () => {
         const token = `${VERIFICATION_TOKEN_PREFIX}valid`;
         mockRedisService.get.mockResolvedValue('user@example.com');
         mockRedisService.del.mockResolvedValue(1);

         const result = await service.consume(token);
         expect(result).toBe('user@example.com');
         expect(mockRedisService.del).toHaveBeenCalledWith(AuthRedisKeys.verificationToken(token));
      });

      it('should return null and not delete key when token does not exist', async () => {
         const token = `${VERIFICATION_TOKEN_PREFIX}nonexistent`;
         mockRedisService.get.mockResolvedValue(null);

         const result = await service.consume(token);
         expect(result).toBeNull();
         expect(mockRedisService.del).not.toHaveBeenCalled();
      });
   });
});
