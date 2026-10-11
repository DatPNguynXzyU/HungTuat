import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import type { ICursorPaginationMeta } from '@common/interfaces/response.interface';

export class UserSearchQueryDto {
   @ApiProperty({
      description: 'Search query keyword matching username, displayName, or bio',
      example: 'alex',
   })
   @IsString({ message: 'Search query must be a string' })
   @IsNotEmpty({ message: 'Search query must not be empty' })
   q!: string;

   @ApiPropertyOptional({
      default: 10,
      minimum: 1,
      maximum: 50,
      description: 'Number of results to load per infinite scroll batch',
      example: 10,
   })
   @IsOptional()
   @Type(() => Number)
   @IsInt()
   @Min(1)
   @Max(50)
   limit: number = 10;

   @ApiPropertyOptional({
      description: 'Opaque cursor string for infinite scroll (omit on first call)',
      example: 'eyJzb3J0IjpbMTIuNDUsIjAxOGYzYSJdfQ',
   })
   @IsOptional()
   @IsString()
   cursor?: string;
}

export class CursorPaginationMetaDto implements ICursorPaginationMeta {
   @ApiPropertyOptional({
      description: 'Opaque cursor string to pass in next request to load more items (null if no more items)',
      nullable: true,
      example: 'eyJzb3J0IjpbMTIuNDUsIjAxOGYzYSJdfQ',
   })
   nextCursor?: string | null;

   @ApiProperty({
      description: 'Whether there are more items to load in the infinite scroll list',
      example: true,
   })
   hasMore!: boolean;

   @ApiProperty({
      description: 'Number of items requested per batch',
      example: 10,
   })
   limit!: number;

   @ApiPropertyOptional({
      description: 'Estimated total number of matching items found (if available)',
      example: 45,
   })
   total?: number;
}

export class UserSearchResultItemDto {
   @ApiProperty({ example: '018f3a2b-4c5d-7e8f-9a0b-1c2d3e4f5a6b' })
   id!: string;

   @ApiPropertyOptional({ example: 'alex_doe', nullable: true })
   username?: string | null;

   @ApiPropertyOptional({ example: 'Alex Doe', nullable: true })
   displayName?: string | null;

   @ApiPropertyOptional({ example: 'https://cdn.example.com/avatars/alex.jpg', nullable: true })
   avatar?: string | null;

   @ApiPropertyOptional({ example: 'Software Engineer & OSS Contributor', nullable: true })
   bio?: string | null;

   @ApiProperty({ example: false })
   isVerified!: boolean;

   @ApiProperty({ example: 120 })
   followersCount!: number;

   @ApiProperty({ example: 45 })
   followingCount!: number;

   @ApiProperty({ example: false, description: 'Whether the current authenticated user is following this user' })
   isFollowing!: boolean;

   @ApiProperty({ example: false, description: 'Whether this user is following the current authenticated user' })
   isFollower!: boolean;

   @ApiProperty({ example: false, description: 'Whether this user is the current authenticated user themselves' })
   isSelf!: boolean;
}

export class UserSearchResponseDto {
   @ApiProperty({ type: [UserSearchResultItemDto] })
   items!: UserSearchResultItemDto[];

   @ApiProperty({ type: CursorPaginationMetaDto })
   meta!: CursorPaginationMetaDto;
}
