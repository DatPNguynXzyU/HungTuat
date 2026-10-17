import { Module } from '@nestjs/common';
import { RmqModule, SERVICES } from '@common';
import { PostsController } from '@/modules/posts/posts.controller';
import { PostsService } from '@/modules/posts/posts.service';

@Module({
   imports: [
      RmqModule.register({
         name: SERVICES.POST_SERVICE,
      }),
   ],
   controllers: [PostsController],
   providers: [PostsService],
   exports: [PostsService],
})
export class PostsModule {}
