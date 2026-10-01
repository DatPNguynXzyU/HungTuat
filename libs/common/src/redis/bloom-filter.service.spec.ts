import { Test, TestingModule } from '@nestjs/testing';
import { BloomFilterService } from '@common/redis/bloom-filter.service';
import { RedisService } from '@common/redis/redis.service';

describe('BloomFilterService', () => {
   let service: BloomFilterService;
   let mockRedisService: Partial<RedisService>;
   let fakeRedisBitmaps: Map<string, Map<number, number>>;

   beforeEach(async () => {
      fakeRedisBitmaps = new Map();

      const mockClient = {
         pipeline: jest.fn().mockImplementation(() => {
            const pipelineOps: Array<() => [Error | null, number]> = [];
            return {
               setbit: jest.fn().mockImplementation((key: string, offset: number, value: number) => {
                  pipelineOps.push(() => {
                     if (!fakeRedisBitmaps.has(key)) {
                        fakeRedisBitmaps.set(key, new Map());
                     }
                     fakeRedisBitmaps.get(key)!.set(offset, value);
                     return [null, value];
                  });
                  return this;
               }),
               getbit: jest.fn().mockImplementation((key: string, offset: number) => {
                  pipelineOps.push(() => {
                     const bit = fakeRedisBitmaps.get(key)?.get(offset) ?? 0;
                     return [null, bit];
                  });
                  return this;
               }),
               exec: jest.fn().mockImplementation(() => {
                  return Promise.resolve(pipelineOps.map((op) => op()));
               }),
            };
         }),
      };

      mockRedisService = {
         getClient: jest.fn().mockReturnValue(mockClient as any),
         del: jest.fn().mockImplementation((key: string) => {
            fakeRedisBitmaps.delete(key);
            return Promise.resolve();
         }),
      };

      const module: TestingModule = await Test.createTestingModule({
         providers: [
            BloomFilterService,
            {
               provide: RedisService,
               useValue: mockRedisService,
            },
         ],
      }).compile();

      service = module.get<BloomFilterService>(BloomFilterService);
   });

   it('should be defined', () => {
      expect(service).toBeDefined();
   });

   it('should calculate consistent offsets for the same item', () => {
      const offsets1 = service.getOffsets('test@example.com');
      const offsets2 = service.getOffsets('test@example.com');
      expect(offsets1).toEqual(offsets2);
      expect(offsets1.length).toBe(7);
   });

   it('should return false for item not added to filter', async () => {
      const exists = await service.contains('test_filter', 'nonexistent@example.com');
      expect(exists).toBe(false);
   });

   it('should return true for item added to filter', async () => {
      const filterKey = 'test_filter';
      const email = 'hello@example.com';

      await service.add(filterKey, email);
      const exists = await service.contains(filterKey, email);

      expect(exists).toBe(true);
   });

   it('should support addBatch with multiple items', async () => {
      const filterKey = 'test_filter_batch';
      const emails = ['user1@example.com', 'user2@example.com', 'user3@example.com'];

      await service.addBatch(filterKey, emails);

      for (const email of emails) {
         const exists = await service.contains(filterKey, email);
         expect(exists).toBe(true);
      }

      const notAdded = await service.contains(filterKey, 'user4@example.com');
      expect(notAdded).toBe(false);
   });

   it('should reset filter cleanly', async () => {
      const filterKey = 'test_filter_reset';
      const email = 'user@example.com';

      await service.add(filterKey, email);
      expect(await service.contains(filterKey, email)).toBe(true);

      await service.reset(filterKey);
      expect(await service.contains(filterKey, email)).toBe(false);
   });

   it('should fallback to in-memory local bitmap when Redis client is null', async () => {
      const localOnlyModule: TestingModule = await Test.createTestingModule({
         providers: [
            BloomFilterService,
            {
               provide: RedisService,
               useValue: {
                  getClient: jest.fn().mockReturnValue(null),
                  del: jest.fn().mockResolvedValue(undefined),
               },
            },
         ],
      }).compile();

      const localService = localOnlyModule.get<BloomFilterService>(BloomFilterService);
      const filterKey = 'local_filter';

      await localService.add(filterKey, 'local@example.com');
      expect(await localService.contains(filterKey, 'local@example.com')).toBe(true);
      expect(await localService.contains(filterKey, 'other@example.com')).toBe(false);
   });
});
