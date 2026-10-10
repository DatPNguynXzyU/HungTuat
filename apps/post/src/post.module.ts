import { Module } from '@nestjs/common';
import { RedisModule, RmqModule, SERVICES } from '@common';
import { PostController } from '@post/post.controller';
import { PostService } from '@post/post.service';
import { PostConfigModule } from '@post/config';
import { PostLoggerModule } from '@post/logger';
import { PrismaModule } from '@post/prisma';

@Module({
   imports: [
      PostConfigModule,
      PostLoggerModule,
      PrismaModule,
      RedisModule,
      RmqModule.register({
         name: SERVICES.USER_SERVICE,
      }),
   ],
   controllers: [PostController],
   providers: [PostService],
   exports: [PostService],
})
export class PostModule {}
