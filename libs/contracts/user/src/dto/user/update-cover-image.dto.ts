import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateCoverImageDto {
   @ApiProperty({
      example: 'https://res.cloudinary.com/demo/image/upload/v1/cover.jpg',
      description: 'Public URL to the user cover image',
   })
   @IsNotEmpty({ message: 'Cover image URL is required' })
   @IsString({ message: 'Cover image URL must be a string' })
   coverImage!: string;
}
