import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PostService } from '@post/post.service';

@Controller()
export class PostController {
   constructor(private readonly postService: PostService) {}

   @MessagePattern('post.create')
   createPost(@Payload() data: { userId: string; content: string; mediaUrls?: string[] }) {
      return this.postService.createPost(data);
   }

   @MessagePattern('post.get')
   getPost(@Payload() data: { postId: string }) {
      return this.postService.getPost(data.postId);
   }

   @MessagePattern('post.list')
   listPosts(@Payload() data: { userId?: string; page?: number; limit?: number }) {
      return this.postService.listPosts(data);
   }

   @MessagePattern('post.update')
   updatePost(@Payload() data: { postId: string; content?: string; mediaUrls?: string[] }) {
      return this.postService.updatePost(data);
   }

   @MessagePattern('post.delete')
   deletePost(@Payload() data: { postId: string }) {
      return this.postService.deletePost(data.postId);
   }

   @MessagePattern('post.uploadVideo')
   uploadVideo(@Payload() data: { postId: string; videoUrl: string; metadata?: Record<string, unknown> }) {
      return this.postService.uploadVideo(data);
   }
}
