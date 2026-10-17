import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class UpdateUsernameDto {
   @ApiProperty({
      example: 'alex_smith',
      description:
         'New unique username handle. Allowed characters: lowercase letters, numbers, and underscores (3-30 characters). Changes are permitted once every 30 days.',
      minLength: 3,
      maxLength: 30,
   })
   @IsNotEmpty({ message: 'Username is required' })
   @IsString({ message: 'Username must be a string' })
   @MinLength(3, { message: 'Username must be at least 3 characters long' })
   @MaxLength(30, { message: 'Username cannot exceed 30 characters' })
   @Matches(/^[a-zA-Z0-9_]+$/, {
      message: 'Username can only contain alphanumeric characters and underscores',
   })
   username!: string;
}
