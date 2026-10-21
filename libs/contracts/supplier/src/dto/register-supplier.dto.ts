import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class RegisterSupplierDto {
   @ApiProperty({
      description: 'Official supplier or supermarket name',
      example: 'Mega Market An Phú',
      maxLength: 150,
   })
   @IsNotEmpty()
   @IsString()
   @MaxLength(150)
   supplierName!: string;

   @ApiProperty({
      description: 'Merchant unique identification code',
      example: 'SUPP-MM-AP',
      maxLength: 50,
   })
   @IsNotEmpty()
   @IsString()
   @MaxLength(50)
   supplierCode!: string;

   @ApiPropertyOptional({
      description: 'Supplier contact email',
      example: 'contact@megamarket.vn',
   })
   @IsOptional()
   @IsEmail()
   contactEmail?: string;

   @ApiPropertyOptional({
      description: 'Supplier contact hotline',
      example: '19001234',
   })
   @IsOptional()
   @IsString()
   contactPhone?: string;

   @ApiPropertyOptional({
      description: 'Physical address of the supplier store',
      example: 'Khu B, KĐT mới An Phú - An Khánh, TP. Thủ Đức, TP. Hồ Chí Minh',
   })
   @IsOptional()
   @IsString()
   address?: string;

   @ApiPropertyOptional({
      description: 'City of operation',
      example: 'Hồ Chí Minh',
   })
   @IsOptional()
   @IsString()
   city?: string;

   @ApiPropertyOptional({
      description: 'Logo or brand image URL',
      example: 'https://cdn.omniservices.com/suppliers/mega-market.png',
   })
   @IsOptional()
   @IsString()
   supplierLogoUrl?: string;
}
