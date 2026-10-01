import { Test, TestingModule } from '@nestjs/testing';
import { BloomFilterService, REDIS_KEY_PREFIX, RedisService } from '@common';
import { USER_REPOSITORY } from '@user/repositories';
import { UsernameBloomFilterService } from '@user/services/username-bloom-filter.service';

describe('UsernameBloomFilterService', () => {
   let service: UsernameBloomFilterService;
   let bloomFilterService: Partial<BloomFilterService>;
   let userRepository: {
      findAllUsernames: jest.Mock;
      findByUsername: jest.Mock;
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

      userRepository = {
         findAllUsernames: jest.fn().mockResolvedValue(['admin', 'john_doe']),
         findByUsername: jest.fn().mockResolvedValue(null),
      };

      redisService = {
         get: jest.fn().mockResolvedValue(null),
         set: jest.fn().mockResolvedValue(undefined),
      };

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            UsernameBloomFilterService,
            {
               provide: BloomFilterService,
               useValue: bloomFilterService,
            },
            {
               provide: USER_REPOSITORY,
               useValue: userRepository,
            },
            {
               provide: RedisService,
               useValue: redisService,
            },
         ],
      }).compile();

      service = module.get<UsernameBloomFilterService>(UsernameBloomFilterService);
   });

   it('should be defined', () => {
      expect(service).toBeDefined();
   });

   it('should initialize bloom filter from database on startup when not cached in Redis', async () => {
      redisService.get.mockResolvedValue(null);

      await service.onModuleInit();

      expect(userRepository.findAllUsernames).toHaveBeenCalled();
      expect(bloomFilterService.addBatch).toHaveBeenCalledWith(REDIS_KEY_PREFIX.BLOOM_USERNAME, ['admin', 'john_doe']);
      expect(redisService.set).toHaveBeenCalled();
   });

   it('should skip DB initialization if already marked initialized in Redis', async () => {
      redisService.get.mockResolvedValue('1');

      await service.onModuleInit();

      expect(userRepository.findAllUsernames).not.toHaveBeenCalled();
      expect(bloomFilterService.addBatch).not.toHaveBeenCalled();
   });

   it('should add username with normalized lowercase trim', async () => {
      await service.addUsername('  John_Doe  ');

      expect(bloomFilterService.add).toHaveBeenCalledWith(REDIS_KEY_PREFIX.BLOOM_USERNAME, 'john_doe');
   });

   it('should check if username might exist via bloom filter', async () => {
      (bloomFilterService.contains as jest.Mock).mockResolvedValue(true);

      const exists = await service.mightContain('john_doe');

      expect(bloomFilterService.contains).toHaveBeenCalledWith(REDIS_KEY_PREFIX.BLOOM_USERNAME, 'john_doe');
      expect(exists).toBe(true);
   });

   it('should return true for isUsernameAvailable when bloom filter returns false without querying DB', async () => {
      (bloomFilterService.contains as jest.Mock).mockResolvedValue(false);

      const available = await service.isUsernameAvailable('brand_new_username');

      expect(available).toBe(true);
      expect(userRepository.findByUsername).not.toHaveBeenCalled();
   });

   it('should query DB when bloom filter returns true and return false if user exists', async () => {
      (bloomFilterService.contains as jest.Mock).mockResolvedValue(true);
      userRepository.findByUsername.mockResolvedValue({ id: 'user-1', username: 'taken_username' });

      const available = await service.isUsernameAvailable('taken_username');

      expect(available).toBe(false);
      expect(userRepository.findByUsername).toHaveBeenCalledWith('taken_username');
   });

   it('should query DB when bloom filter returns true and return true if DB confirms it is a false positive', async () => {
      (bloomFilterService.contains as jest.Mock).mockResolvedValue(true);
      userRepository.findByUsername.mockResolvedValue(null);

      const available = await service.isUsernameAvailable('false_positive');

      expect(available).toBe(true);
      expect(userRepository.findByUsername).toHaveBeenCalledWith('false_positive');
   });
});
