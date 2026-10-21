import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SupplierItemDto } from '@contracts/commerce/dto/supplier/supplier-response.dto';

export class SupplierProductOfferDto {
   @ApiProperty({
      description: 'Product offer unique UUID',
      example: '0192e21b-0004-7000-8000-000000000001',
   })
   productId!: string;

   @ApiProperty({
      description: 'Supplier ID offering this product',
      example: '0192e21b-0003-7000-8000-000000000001',
   })
   supplierId!: string;

   @ApiProperty({
      description: 'Ingredient ID associated with this product',
      example: '0192e21b-0002-7000-8000-000000000001',
   })
   ingredientId!: string;

   @ApiProperty({
      description: 'Supplier product SKU code',
      example: 'SKU-WAGYU-A5-200G',
   })
   productSku!: string;

   @ApiProperty({
      description: 'Listing title on the supplier catalog',
      example: 'Thịt thăn bò Wagyu A5 nhập khẩu Nhật Bản 200g',
   })
   productTitle!: string;

   @ApiProperty({
      description: 'Current selling price in VND',
      example: 450000,
   })
   price!: number;

   @ApiProperty({
      description: 'Currency code (ISO 4217)',
      example: 'VND',
   })
   currency!: string;

   @ApiPropertyOptional({
      description: 'Original list price before discounts',
      example: 520000,
   })
   originalPrice?: number;

   @ApiPropertyOptional({
      description: 'Package size description (e.g. 200g, 500g, khay 1kg)',
      example: 'Khay 200g',
   })
   packageSize?: string;

   @ApiProperty({
      description: 'Available inventory stock quantity',
      example: 45,
   })
   stockQuantity!: number;

   @ApiProperty({
      description: 'Whether the item is currently in stock and purchasable',
      example: true,
   })
   inStock!: boolean;

   @ApiPropertyOptional({
      description: 'External or direct checkout buy link for instant online purchase',
      example: 'https://megamarket.vn/p/wagyu-a5-200g',
   })
   productUrl?: string;

   @ApiPropertyOptional({
      description: 'Product thumbnail image URL',
      example: 'https://cdn.omniservices.com/products/wagyu-a5-pack.webp',
   })
   productImageUrl?: string;

   @ApiProperty({
      description: 'Offer status (AVAILABLE, OUT_OF_STOCK, DISCONTINUED)',
      example: 'AVAILABLE',
   })
   offerStatus!: string;

   @ApiPropertyOptional({
      description: 'Full supplier metadata offering this product',
      type: SupplierItemDto,
   })
   supplier?: SupplierItemDto;
}

export class IngredientSuppliersResponseDto {
   @ApiProperty({
      description: 'Ingredient ID',
      example: '0192e21b-0002-7000-8000-000000000001',
   })
   ingredientId!: string;

   @ApiProperty({
      description: 'Ingredient name',
      example: 'Thịt thăn bò Wagyu A5',
   })
   ingredientName!: string;

   @ApiProperty({
      description: 'List of supplier product offers for purchasing this ingredient',
      type: [SupplierProductOfferDto],
   })
   offers!: SupplierProductOfferDto[];

   @ApiProperty({
      description: 'Total number of active offers',
      example: 3,
   })
   totalOffers!: number;
}
