import { Test, TestingModule } from '@nestjs/testing';
import { BloomFilterService, RedisService } from '@common';
import { UserRedisKeys } from '@user/constants/user-redis.constant';
import { USER_PROFILE_REPOSITORY } from '@user/modules/profile/repositories/user-profile.repository';
import { UsernameBloomFilterService } from '@user/services/infrastructure/username-bloom-filter.service';

describe('UsernameBloomFilterService (Infrastructure)', () => {
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
               provide: USER_PROFILE_REPOSITORY,
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
      expect(bloomFilterService.addBatch).toHaveBeenCalledWith(UserRedisKeys.bloomUsername(), ['admin', 'john_doe']);
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

      expect(bloomFilterService.add).toHaveBeenCalledWith(UserRedisKeys.bloomUsername(), 'john_doe');
   });

   it('should check if username might exist via bloom filter', async () => {
      (bloomFilterService.contains as jest.Mock).mockResolvedValue(true);

      const exists = await service.mightContain('john_doe');

      expect(bloomFilterService.contains).toHaveBeenCalledWith(UserRedisKeys.bloomUsername(), 'john_doe');
      expect(exists).toBe(true);
   });

   it('should return true for isUsernameAvailable when bloom filter returns false without querying DB', async () => {
      (bloomFilterService.contains as jest.Mock).mockResolvedValue(false);

      const isAvailable = await service.isUsernameAvailable('unique_user_123');

      expect(bloomFilterService.contains).toHaveBeenCalledWith(UserRedisKeys.bloomUsername(), 'unique_user_123');
      expect(userRepository.findByUsername).not.toHaveBeenCalled();
      expect(isAvailable).toBe(true);
   });

   it('should query DB when bloom filter returns true (false positive check)', async () => {
      (bloomFilterService.contains as jest.Mock).mockResolvedValue(true);
      userRepository.findByUsername.mockResolvedValue(null);

      const isAvailable = await service.isUsernameAvailable('maybe_taken');

      expect(bloomFilterService.contains).toHaveBeenCalledWith(UserRedisKeys.bloomUsername(), 'maybe_taken');
      expect(userRepository.findByUsername).toHaveBeenCalledWith('maybe_taken');
      expect(isAvailable).toBe(true);
   });

   it('should return false for isUsernameAvailable when bloom filter returns true and DB confirms user exists', async () => {
      (bloomFilterService.contains as jest.Mock).mockResolvedValue(true);
      userRepository.findByUsername.mockResolvedValue({ id: 'user-1', username: 'taken_user' });

      const isAvailable = await service.isUsernameAvailable('taken_user');

      expect(bloomFilterService.contains).toHaveBeenCalledWith(UserRedisKeys.bloomUsername(), 'taken_user');
      expect(userRepository.findByUsername).toHaveBeenCalledWith('taken_user');
      expect(isAvailable).toBe(false);
   });
});
