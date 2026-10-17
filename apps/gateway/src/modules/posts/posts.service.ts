import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
   POST_PATTERNS,
   type GetPostFeedDto,
   type PostFeedResponseDto,
   type PostIngredientDto,
   type PostItemDto,
} from '@contracts/post';
import { SERVICES } from '@common';

@Injectable()
export class PostsService {
   constructor(
      @Inject(SERVICES.POST_SERVICE)
      private readonly postClient: ClientProxy,
   ) {}

   async getFeed(query: GetPostFeedDto): Promise<PostFeedResponseDto> {
      return firstValueFrom(this.postClient.send<PostFeedResponseDto>({ cmd: POST_PATTERNS.GET_FEED }, query));
   }

   async getPostById(postId: string): Promise<PostItemDto> {
      return firstValueFrom(this.postClient.send<PostItemDto>({ cmd: POST_PATTERNS.GET_BY_ID }, { postId }));
   }

   async getIngredients(postId: string): Promise<PostIngredientDto[]> {
      return firstValueFrom(
         this.postClient.send<PostIngredientDto[]>({ cmd: POST_PATTERNS.GET_INGREDIENTS }, { postId }),
      );
   }
}
