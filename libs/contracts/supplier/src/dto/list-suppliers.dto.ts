import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { SUPPLIER_STATUS, type SupplierStatusType } from '@contracts/supplier/constants/status.constant';
import { SupplierItemDto } from '@contracts/supplier/dto/supplier-item.dto';

export class ListSuppliersQueryDto {
   @ApiPropertyOptional({
      description: 'Filter suppliers by status',
      enum: SUPPLIER_STATUS,
      example: SUPPLIER_STATUS.ACTIVE,
   })
   @IsOptional()
   @IsEnum(SUPPLIER_STATUS)
   status?: SupplierStatusType;

   @ApiPropertyOptional({
      description: 'Filter suppliers by operating city',
      example: 'Hồ Chí Minh',
   })
   @IsOptional()
   @IsString()
   city?: string;

   @ApiPropertyOptional({
      description: 'Number of items per page',
      example: 20,
      default: 20,
   })
   @IsOptional()
   @Type(() => Number)
   @IsInt()
   @Min(1)
   @Max(100)
   limit?: number = 20;

   @ApiPropertyOptional({
      description: 'Offset for pagination',
      example: 0,
      default: 0,
   })
   @IsOptional()
   @Type(() => Number)
   @IsInt()
   @Min(0)
   offset?: number = 0;
}

export class ListSuppliersResponseDto {
   @ApiPropertyOptional({
      description: 'List of matching supplier profiles',
      type: [SupplierItemDto],
   })
   items!: SupplierItemDto[];

   @ApiPropertyOptional({
      description: 'Total number of matching suppliers',
      example: 42,
   })
   total!: number;

   @ApiPropertyOptional({
      description: 'Current page size limit',
      example: 20,
   })
   limit!: number;

   @ApiPropertyOptional({
      description: 'Current offset',
      example: 0,
   })
   offset!: number;
}
