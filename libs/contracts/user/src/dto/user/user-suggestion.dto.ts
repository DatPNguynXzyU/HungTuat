import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { USER_SUGGESTION_REASONS, type UserSuggestionReason } from '@contracts/user/constants';

export class UserSuggestionQueryDto {
   @ApiPropertyOptional({
      default: 10,
      minimum: 1,
      maximum: 30,
      description: 'Maximum number of friend suggestions to retrieve',
      example: 10,
   })
   @IsOptional()
   @Type(() => Number)
   @IsInt()
   @Min(1)
   @Max(30)
   limit: number = 10;
}

export class UserSuggestionItemDto {
   @ApiProperty({ example: '018f3a2b-4c5d-7e8f-9a0b-1c2d3e4f5a6b' })
   id!: string;

   @ApiPropertyOptional({ example: 'sara_connor', nullable: true })
   username?: string | null;

   @ApiPropertyOptional({ example: 'Sara Connor', nullable: true })
   displayName?: string | null;

   @ApiPropertyOptional({ example: 'https://cdn.example.com/avatars/sara.jpg', nullable: true })
   avatar?: string | null;

   @ApiPropertyOptional({ example: 'Tech enthusiast & photography lover', nullable: true })
   bio?: string | null;

   @ApiProperty({ example: true })
   isVerified!: boolean;

   @ApiProperty({ example: 450 })
   followersCount!: number;

   @ApiProperty({ example: 120 })
   followingCount!: number;

   @ApiProperty({ example: 3, description: 'Number of mutual friends between the current user and this user' })
   mutualCount!: number;

   @ApiProperty({ example: false, description: 'Whether the current authenticated user is following this user' })
   isFollowing!: boolean;

   @ApiProperty({ example: false, description: 'Whether this user is following the current authenticated user' })
   isFollower!: boolean;

   @ApiProperty({
      example: USER_SUGGESTION_REASONS.MUTUAL_FRIENDS,
      description: 'Reason for the suggestion (e.g. mutual_friends or popular)',
      enum: [USER_SUGGESTION_REASONS.MUTUAL_FRIENDS, USER_SUGGESTION_REASONS.POPULAR],
   })
   reason!: UserSuggestionReason;
}
