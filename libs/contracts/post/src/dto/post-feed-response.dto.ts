import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PostItemDto } from '@contracts/post/dto/post-item.dto';

export class PostFeedResponseDto {
   @ApiProperty({
      description: 'List of video posts for current feed batch',
      type: [PostItemDto],
   })
   items!: PostItemDto[];

   @ApiPropertyOptional({
      description: 'Next cursor token to fetch the subsequent page. Null when no more items exist',
      example:
         'eyJjcmVhdGVkQXQiOiIyMDI2LTEwLTE3VDAyOjAwOjAwLjAwMFoiLCJwb3N0SWQiOiJhMGIxYzJkMy1lNGY1LTY3ODktMDEyMy1hYmNkZWY0NTY3ODkifQ==',
      nullable: true,
   })
   nextCursor!: string | null;

   @ApiProperty({
      description: 'Indicates whether there are additional posts available for further scrolling',
      example: true,
   })
   hasMore!: boolean;
}
