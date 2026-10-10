import { Test, TestingModule } from '@nestjs/testing';
import { PostService } from '@post/post.service';
import { PrismaService } from '@post/prisma';

describe('PostService', () => {
   let service: PostService;

   beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
         providers: [
            PostService,
            {
               provide: PrismaService,
               useValue: {
                  post: {},
                  media: {},
                  tag: {},
               },
            },
         ],
      }).compile();

      service = module.get<PostService>(PostService);
   });

   it('should be defined', () => {
      expect(service).toBeDefined();
   });

   describe('createPost', () => {
      it('should return success response', () => {
         const data = { userId: 'user-1', content: 'Test content' };
         const result = service.createPost(data);

         expect(result.success).toBe(true);
         expect(result.data.userId).toBe(data.userId);
         expect(result.data.content).toBe(data.content);
      });
   });

   describe('getPost', () => {
      it('should return post data', () => {
         const postId = 'post-1';
         const result = service.getPost(postId);

         expect(result.success).toBe(true);
         expect(result.data.postId).toBe(postId);
      });
   });
});
