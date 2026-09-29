import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { UserRepository, FollowRepository } from './repositories';
import { OutboxService } from './outbox';

describe('UserService', () => {
   let service: UserService;

   beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
         providers: [
            UserService,
            {
               provide: UserRepository,
               useValue: {},
            },
            {
               provide: FollowRepository,
               useValue: {},
            },
            {
               provide: OutboxService,
               useValue: {},
            },
         ],
      }).compile();

      service = module.get<UserService>(UserService);
   });

   it('should be defined', () => {
      expect(service).toBeDefined();
   });
});
