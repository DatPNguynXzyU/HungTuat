import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, MaxLength, Min } from 'class-validator';
import { CurrencyEnum } from '@contracts/commerce/constants/currency.constant';

export class CreateProductOfferDto {
   @ApiProperty({
      description: 'UUID of the supplying merchant',
      example: '0192e21b-0003-7000-8000-000000000001',
   })
   @IsNotEmpty()
   @IsString()
   supplierId!: string;

   @ApiProperty({
      description: 'UUID of the standardized ingredient',
      example: '0192e21b-0002-7000-8000-000000000001',
   })
   @IsNotEmpty()
   @IsString()
   ingredientId!: string;

   @ApiProperty({
      description: 'SKU product identifier',
      example: 'SKU-WAGYU-A5-200G',
      maxLength: 100,
   })
   @IsNotEmpty()
   @IsString()
   @MaxLength(100)
   productSku!: string;

   @ApiProperty({
      description: 'Product display title',
      example: 'Thịt thăn bò Wagyu A5 Nhật Bản 200g',
      maxLength: 200,
   })
   @IsNotEmpty()
   @IsString()
   @MaxLength(200)
   productTitle!: string;

   @ApiProperty({
      description: 'Current price in VND',
      example: 450000,
   })
   @IsNotEmpty()
   @Type(() => Number)
   @IsNumber()
   @IsPositive()
   price!: number;

   @ApiPropertyOptional({
      description: 'Currency code',
      enum: CurrencyEnum,
      example: CurrencyEnum.VND,
      default: CurrencyEnum.VND,
   })
   @IsOptional()
   @IsEnum(CurrencyEnum)
   currency?: CurrencyEnum = CurrencyEnum.VND;

   @ApiPropertyOptional({
      description: 'Original retail price before discounts',
      example: 520000,
   })
   @IsOptional()
   @Type(() => Number)
   @IsNumber()
   @IsPositive()
   originalPrice?: number;

   @ApiPropertyOptional({
      description: 'Packaging specification (e.g. 200g, 1kg, 500ml)',
      example: 'Khay 200g',
   })
   @IsOptional()
   @IsString()
   packageSize?: string;

   @ApiPropertyOptional({
      description: 'Initial stock quantity',
      example: 100,
      default: 0,
   })
   @IsOptional()
   @Type(() => Number)
   @IsInt()
   @Min(0)
   stockQuantity?: number = 0;

   @ApiPropertyOptional({
      description: 'Direct link to buy product online from the vendor',
      example: 'https://megamarket.vn/p/wagyu-a5-200g',
   })
   @IsOptional()
   @IsString()
   productUrl?: string;

   @ApiPropertyOptional({
      description: 'Product image asset URL',
      example: 'https://cdn.omniservices.com/products/wagyu-a5-pack.webp',
   })
   @IsOptional()
   @IsString()
   productImageUrl?: string;
}
