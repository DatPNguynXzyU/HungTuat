import { Test, TestingModule } from '@nestjs/testing';
import { PostController } from '@post/post.controller';
import { PostService } from '@post/post.service';

describe('PostController', () => {
   let controller: PostController;
   let service: PostService;

   beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
         controllers: [PostController],
         providers: [
            {
               provide: PostService,
               useValue: {
                  createPost: jest.fn(),
                  getPost: jest.fn(),
                  listPosts: jest.fn(),
                  updatePost: jest.fn(),
                  deletePost: jest.fn(),
                  uploadVideo: jest.fn(),
               },
            },
         ],
      }).compile();

      controller = module.get<PostController>(PostController);
      service = module.get<PostService>(PostService);
   });

   it('should be defined', () => {
      expect(controller).toBeDefined();
   });

   describe('createPost', () => {
      it('should create a post', () => {
         const data = { userId: 'user-1', content: 'Test post' };
         const result = {
            success: true,
            message: 'Post created successfully',
            data: {
               postId: 'temp-id',
               userId: data.userId,
               content: data.content,
               mediaUrls: [],
               createdAt: new Date(),
            },
         };

         const createPostSpy = jest.spyOn(service, 'createPost').mockReturnValue(result);

         expect(controller.createPost(data)).toBe(result);
         expect(createPostSpy).toHaveBeenCalledWith(data);
      });
   });

   describe('getPost', () => {
      it('should get a post', () => {
         const data = { postId: 'post-1' };
         const result = {
            success: true,
            data: {
               postId: data.postId,
               userId: 'user-id',
               content: 'Sample post content',
               mediaUrls: [],
               createdAt: new Date(),
            },
         };

         const getPostSpy = jest.spyOn(service, 'getPost').mockReturnValue(result);

         expect(controller.getPost(data)).toBe(result);
         expect(getPostSpy).toHaveBeenCalledWith(data.postId);
      });
   });
});
