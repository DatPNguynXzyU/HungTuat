import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class SearchIngredientsDto {
   @ApiPropertyOptional({
      description: 'Search query keyword matching ingredient name, slug or alias',
      example: 'thit bo',
   })
   @IsOptional()
   @IsString()
   query?: string;

   @ApiPropertyOptional({
      description: 'Optional category ID filter (e.g. MEAT, VEGETABLE, SPICE)',
      example: '0192e21b-0001-7000-8000-000000000001',
   })
   @IsOptional()
   @IsString()
   categoryId?: string;

   @ApiPropertyOptional({
      description: 'Number of items to return (default 20, max 50)',
      example: 20,
      default: 20,
   })
   @IsOptional()
   @Type(() => Number)
   @IsInt()
   @Min(1)
   @Max(50)
   limit?: number = 20;

   @ApiPropertyOptional({
      description: 'Number of items to skip for pagination',
      example: 0,
      default: 0,
   })
   @IsOptional()
   @Type(() => Number)
   @IsInt()
   @Min(0)
   offset?: number = 0;
}
