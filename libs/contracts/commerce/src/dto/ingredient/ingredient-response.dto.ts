import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CategoryItemDto {
   @ApiProperty({
      description: 'Category unique identifier UUID',
      example: '0192e21b-0001-7000-8000-000000000001',
   })
   categoryId!: string;

   @ApiProperty({
      description: 'Category human-readable name',
      example: 'Thịt & Hải sản',
   })
   categoryName!: string;

   @ApiProperty({
      description: 'Unique URL-friendly slug',
      example: 'thit-hai-san',
   })
   categorySlug!: string;

   @ApiPropertyOptional({
      description: 'Icon URL for the category',
      example: 'https://cdn.omniservices.com/categories/meat.svg',
   })
   iconUrl?: string;
}

export class IngredientItemDto {
   @ApiProperty({
      description: 'Ingredient unique identifier UUID',
      example: '0192e21b-0002-7000-8000-000000000001',
   })
   ingredientId!: string;

   @ApiProperty({
      description: 'Ingredient display name',
      example: 'Thịt thăn bò Wagyu A5',
   })
   ingredientName!: string;

   @ApiProperty({
      description: 'Normalized lowercase string for fuzzy matching',
      example: 'thit than bo wagyu a5',
   })
   normalizedName!: string;

   @ApiProperty({
      description: 'Unique URL slug for web links',
      example: 'thit-than-bo-wagyu-a5',
   })
   ingredientSlug!: string;

   @ApiProperty({
      description: 'Culinary notes, nutritional info or description (mandatory for food safety)',
      example: 'Thịt bò Wagyu vân mỡ cẩm thạch cao cấp.',
   })
   ingredientDescription!: string;

   @ApiProperty({
      description: 'Ingredient visual asset URL for clear recognition',
      example: 'https://cdn.omniservices.com/ingredients/wagyu-a5.webp',
   })
   ingredientImageUrl!: string;

   @ApiProperty({
      description: 'Category identifier',
      example: '0192e21b-0001-7000-8000-000000000001',
   })
   categoryId!: string;

   @ApiProperty({
      description: 'Category name (mandatory for ingredient classification)',
      example: 'Thịt & Hải sản',
   })
   categoryName!: string;

   @ApiProperty({
      description: 'Standard unit of measure (e.g. g, ml, quả)',
      example: 'g',
   })
   defaultUnit!: string;

   @ApiProperty({
      description: 'Status of ingredient (ACTIVE, INACTIVE)',
      example: 'ACTIVE',
   })
   ingredientStatus!: string;

   @ApiProperty({
      description: 'Total number of active suppliers offering this ingredient',
      example: 3,
   })
   supplierCount!: number;

   @ApiProperty({
      description: 'Minimum available price across suppliers in VND',
      example: 450000,
   })
   minPrice!: number;

   @ApiProperty({
      description: 'Maximum available price across suppliers in VND',
      example: 750000,
   })
   maxPrice!: number;

   @ApiProperty({
      description: 'Currency code (ISO 4217)',
      example: 'VND',
   })
   currency!: string;
}

export class SearchIngredientsResponseDto {
   @ApiProperty({
      description: 'List of matching ingredients in the catalog',
      type: [IngredientItemDto],
   })
   items!: IngredientItemDto[];

   @ApiProperty({
      description: 'Total count of matched items',
      example: 1,
   })
   total!: number;

   @ApiProperty({
      description: 'Pagination limit',
      example: 20,
   })
   limit!: number;

   @ApiProperty({
      description: 'Pagination offset',
      example: 0,
   })
   offset!: number;
}
