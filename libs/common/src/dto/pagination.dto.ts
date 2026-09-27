import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { IPaginationMeta } from '@common/interfaces/response.interface';

export class PaginationQueryDto {
   @ApiPropertyOptional({ default: 1, minimum: 1, description: 'Page number' })
   @IsOptional()
   @Type(() => Number)
   @IsInt()
   @Min(1)
   page?: number = 1;

   @ApiPropertyOptional({
      default: 10,
      minimum: 1,
      maximum: 100,
      description: 'Items per page',
   })
   @IsOptional()
   @Type(() => Number)
   @IsInt()
   @Min(1)
   @Max(100)
   limit?: number = 10;
}

export class PaginationMetaDto implements IPaginationMeta {
   @ApiProperty({ example: 1 })
   page: number;

   @ApiProperty({ example: 10 })
   limit: number;

   @ApiProperty({ example: 100 })
   total: number;

   @ApiProperty({ example: 10 })
   totalPages: number;

   @ApiProperty({ example: true })
   hasNext: boolean;

   @ApiProperty({ example: false })
   hasPrev: boolean;
}
