import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateBioDto {
   @ApiPropertyOptional({
      example: 'Passionate software engineer and open source contributor',
      description: 'Short profile biography (maximum 500 characters)',
      maxLength: 500,
   })
   @IsOptional()
   @IsString({ message: 'Bio must be a string' })
   @MaxLength(500, { message: 'Bio cannot exceed 500 characters' })
   bio?: string;
}
