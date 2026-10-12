import { Test, TestingModule } from '@nestjs/testing';
import { BloomFilterService, REDIS_KEY_PREFIX, RedisService } from '@common';
import { AUTH_REPOSITORY } from '@auth/repositories/auth.repository.interface';
import { EmailBloomFilterService } from './email-bloom-filter.service';

describe('EmailBloomFilterService', () => {
   let service: EmailBloomFilterService;
   let bloomFilterService: Partial<BloomFilterService>;
   let authRepository: {
      findAllEmails: jest.Mock;
      findByEmail: jest.Mock;
   };
   let redisService: {
      get: jest.Mock;
      set: jest.Mock;
   };

   beforeEach(async () => {
      bloomFilterService = {
         add: jest.fn().mockResolvedValue(undefined),
         addBatch: jest.fn().mockResolvedValue(undefined),
         contains: jest.fn().mockResolvedValue(false),
      };

      authRepository = {
         findAllEmails: jest.fn().mockResolvedValue(['admin@example.com', 'user@example.com']),
         findByEmail: jest.fn().mockResolvedValue(null),
      };

      redisService = {
         get: jest.fn().mockResolvedValue(null),
         set: jest.fn().mockResolvedValue(undefined),
      };

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            EmailBloomFilterService,
            {
               provide: BloomFilterService,
               useValue: bloomFilterService,
            },
            {
               provide: AUTH_REPOSITORY,
               useValue: authRepository,
            },
            {
               provide: RedisService,
               useValue: redisService,
            },
         ],
      }).compile();

      service = module.get<EmailBloomFilterService>(EmailBloomFilterService);
   });

   it('should be defined', () => {
      expect(service).toBeDefined();
   });

   it('should initialize bloom filter from database on startup when not cached in Redis', async () => {
      redisService.get.mockResolvedValue(null);

      await service.onModuleInit();

      expect(authRepository.findAllEmails).toHaveBeenCalled();
      expect(bloomFilterService.addBatch).toHaveBeenCalledWith(REDIS_KEY_PREFIX.BLOOM_EMAIL, [
         'admin@example.com',
         'user@example.com',
      ]);
      expect(redisService.set).toHaveBeenCalled();
   });

   it('should skip DB initialization if already marked initialized in Redis', async () => {
      redisService.get.mockResolvedValue('1');

      await service.onModuleInit();

      expect(authRepository.findAllEmails).not.toHaveBeenCalled();
      expect(bloomFilterService.addBatch).not.toHaveBeenCalled();
   });

   it('should add email with normalized lowercase trim', async () => {
      await service.addEmail('  NewUser@Domain.COM  ');

      expect(bloomFilterService.add).toHaveBeenCalledWith(REDIS_KEY_PREFIX.BLOOM_EMAIL, 'newuser@domain.com');
   });

   it('should check if email might exist via bloom filter', async () => {
      (bloomFilterService.contains as jest.Mock).mockResolvedValue(true);

      const exists = await service.mightContain('test@example.com');

      expect(bloomFilterService.contains).toHaveBeenCalledWith(REDIS_KEY_PREFIX.BLOOM_EMAIL, 'test@example.com');
      expect(exists).toBe(true);
   });

   it('should return true for isEmailAvailable when bloom filter returns false without querying DB', async () => {
      (bloomFilterService.contains as jest.Mock).mockResolvedValue(false);

      const available = await service.isEmailAvailable('unique@example.com');

      expect(available).toBe(true);
      expect(authRepository.findByEmail).not.toHaveBeenCalled();
   });

   it('should query DB when bloom filter returns true and return false if user exists', async () => {
      (bloomFilterService.contains as jest.Mock).mockResolvedValue(true);
      authRepository.findByEmail.mockResolvedValue({ id: 'user-1', email: 'taken@example.com' });

      const available = await service.isEmailAvailable('taken@example.com');

      expect(available).toBe(false);
      expect(authRepository.findByEmail).toHaveBeenCalledWith('taken@example.com');
   });

   it('should query DB when bloom filter returns true and return true if DB confirms it is a false positive', async () => {
      (bloomFilterService.contains as jest.Mock).mockResolvedValue(true);
      authRepository.findByEmail.mockResolvedValue(null);

      const available = await service.isEmailAvailable('false-positive@example.com');

      expect(available).toBe(true);
      expect(authRepository.findByEmail).toHaveBeenCalledWith('false-positive@example.com');
   });
});
