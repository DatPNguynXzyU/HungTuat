import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GetPostFeedDto {
   @ApiPropertyOptional({
      description: 'Opaque cursor string for cursor-based infinite scroll pagination',
      example:
         'eyJjcmVhdGVkQXQiOiIyMDI2LTEwLTE3VDAyOjAwOjAwLjAwMFoiLCJwb3N0SWQiOiJhMGIxYzJkMy1lNGY1LTY3ODktMDEyMy1hYmNkZWY0NTY3ODkifQ==',
   })
   @IsOptional()
   @IsString()
   cursor?: string;

   @ApiPropertyOptional({
      description: 'Number of posts to fetch per batch. Default is 3 for short-video infinite scroll',
      default: 3,
      minimum: 1,
      maximum: 20,
      example: 3,
   })
   @IsOptional()
   @Type(() => Number)
   @IsInt()
   @Min(1)
   @Max(20)
   limit?: number = 3;

   @ApiPropertyOptional({
      description: 'Filter posts by author user UUID',
      example: 'user-1234-uuid',
   })
   @IsOptional()
   @IsString()
   userId?: string;

   @ApiPropertyOptional({
      description: 'Filter posts by hashtag or keyword tag',
      example: 'vietnamese-food',
   })
   @IsOptional()
   @IsString()
   tag?: string;

   @ApiPropertyOptional({
      description: 'Filter posts by category slug or ID',
      example: 'traditional-soup',
   })
   @IsOptional()
   @IsString()
   category?: string;
}
