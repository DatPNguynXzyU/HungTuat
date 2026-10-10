import { Controller, Optional } from '@nestjs/common';
import { Ctx, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { PostService } from '@post/post.service';
import { RmqService } from '@common';

@Controller()
export class PostController {
   constructor(
      private readonly postService: PostService,
      @Optional() private readonly rmqService?: RmqService,
   ) {}

   @MessagePattern('post.create')
   createPost(@Payload() data: { userId: string; content: string; mediaUrls?: string[] }, @Ctx() context?: RmqContext) {
      try {
         const result = this.postService.createPost(data);
         if (context && this.rmqService) {
            this.rmqService.ack(context);
         }
         return result;
      } catch (error) {
         if (context && this.rmqService) {
            this.rmqService.ack(context);
         }
         throw error;
      }
   }

   @MessagePattern('post.get')
   getPost(@Payload() data: { postId: string }, @Ctx() context?: RmqContext) {
      try {
         const result = this.postService.getPost(data.postId);
         if (context && this.rmqService) {
            this.rmqService.ack(context);
         }
         return result;
      } catch (error) {
         if (context && this.rmqService) {
            this.rmqService.ack(context);
         }
         throw error;
      }
   }

   @MessagePattern('post.list')
   listPosts(@Payload() data: { userId?: string; page?: number; limit?: number }, @Ctx() context?: RmqContext) {
      try {
         const result = this.postService.listPosts(data);
         if (context && this.rmqService) {
            this.rmqService.ack(context);
         }
         return result;
      } catch (error) {
         if (context && this.rmqService) {
            this.rmqService.ack(context);
         }
         throw error;
      }
   }

   @MessagePattern('post.update')
   updatePost(
      @Payload() data: { postId: string; content?: string; mediaUrls?: string[] },
      @Ctx() context?: RmqContext,
   ) {
      try {
         const result = this.postService.updatePost(data);
         if (context && this.rmqService) {
            this.rmqService.ack(context);
         }
         return result;
      } catch (error) {
         if (context && this.rmqService) {
            this.rmqService.ack(context);
         }
         throw error;
      }
   }

   @MessagePattern('post.delete')
   deletePost(@Payload() data: { postId: string }, @Ctx() context?: RmqContext) {
      try {
         const result = this.postService.deletePost(data.postId);
         if (context && this.rmqService) {
            this.rmqService.ack(context);
         }
         return result;
      } catch (error) {
         if (context && this.rmqService) {
            this.rmqService.ack(context);
         }
         throw error;
      }
   }

   @MessagePattern('post.uploadVideo')
   uploadVideo(
      @Payload() data: { postId: string; videoUrl: string; metadata?: Record<string, unknown> },
      @Ctx() context?: RmqContext,
   ) {
      try {
         const result = this.postService.uploadVideo(data);
         if (context && this.rmqService) {
            this.rmqService.ack(context);
         }
         return result;
      } catch (error) {
         if (context && this.rmqService) {
            this.rmqService.ack(context);
         }
         throw error;
      }
   }
}
