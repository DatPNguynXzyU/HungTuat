import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateLocationDto {
   @ApiPropertyOptional({
      example: 'San Francisco, CA',
      description: 'User geographic location string (maximum 100 characters)',
      maxLength: 100,
   })
   @IsOptional()
   @IsString({ message: 'Location must be a string' })
   @MaxLength(100, { message: 'Location cannot exceed 100 characters' })
   location?: string;
}
