import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendSupplierWelcomeEmailDto {
   @ApiProperty({
      example: 'supplier@example.com',
      description: 'Recipient email address for the supplier',
   })
   @IsEmail()
   @IsNotEmpty()
   to: string;

   @ApiProperty({
      example: 'Tech Corp Partner',
      description: 'Recipient or contact full name',
   })
   @IsString()
   @IsNotEmpty()
   fullName: string;

   @ApiPropertyOptional({
      example: 'Tech Supplies Ltd',
      description: 'Business or supplier trade name',
   })
   @IsString()
   @IsOptional()
   supplierName?: string;

   @ApiPropertyOptional({
      example: 'https://supplier.zeion.online/onboarding',
      description: 'Action URL to access supplier portal or onboarding flow',
   })
   @IsString()
   @IsOptional()
   actionUrl?: string;

   @ApiPropertyOptional({
      example: 'en',
      description: 'Preferred recipient language/locale (e.g. en, vi)',
   })
   @IsString()
   @IsOptional()
   locale?: string;
}
