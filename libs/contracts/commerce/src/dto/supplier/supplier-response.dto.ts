import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SupplierItemDto {
   @ApiProperty({
      description: 'Supplier unique UUID',
      example: '0192e21b-0003-7000-8000-000000000001',
   })
   supplierId!: string;

   @ApiProperty({
      description: 'Official supplier or brand name',
      example: 'Mega Market An Phú',
   })
   supplierName!: string;

   @ApiProperty({
      description: 'Unique URL slug for the supplier store page',
      example: 'mega-market-an-phu',
   })
   supplierSlug!: string;

   @ApiProperty({
      description: 'Merchant unique identification code',
      example: 'SUPP-MM-AP',
   })
   supplierCode!: string;

   @ApiPropertyOptional({
      description: 'Customer support or vendor contact email',
      example: 'contact@megamarket.vn',
   })
   contactEmail?: string;

   @ApiPropertyOptional({
      description: 'Hotline or customer support phone number',
      example: '19001234',
   })
   contactPhone?: string;

   @ApiPropertyOptional({
      description: 'Physical address of the supplier outlet or warehouse',
      example: 'Khu B, KĐT mới An Phú - An Khánh, TP. Thủ Đức, TP. Hồ Chí Minh',
   })
   address?: string;

   @ApiPropertyOptional({
      description: 'City or province where supplier operates',
      example: 'Hồ Chí Minh',
   })
   city?: string;

   @ApiProperty({
      description: 'Average customer rating score (1.0 to 5.0)',
      example: 4.8,
   })
   rating!: number;

   @ApiProperty({
      description: 'Whether the vendor has been officially verified by the platform',
      example: true,
   })
   isVerified!: boolean;

   @ApiProperty({
      description: 'Supplier status (ACTIVE, SUSPENDED, PENDING)',
      example: 'ACTIVE',
   })
   supplierStatus!: string;

   @ApiPropertyOptional({
      description: 'Logo or brand avatar URL',
      example: 'https://cdn.omniservices.com/suppliers/mega-market.png',
   })
   supplierLogoUrl?: string;
}
