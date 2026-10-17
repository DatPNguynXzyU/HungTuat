import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateWebsiteDto {
   @ApiPropertyOptional({
      example: 'https://johndoe.dev',
      description: 'Personal or organization website URL (maximum 255 characters)',
      maxLength: 255,
   })
   @IsOptional()
   @IsString({ message: 'Website must be a string' })
   @MaxLength(255, { message: 'Website cannot exceed 255 characters' })
   website?: string;
}
