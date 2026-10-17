import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PostIngredientDto {
   @ApiProperty({
      description: 'Unique identifier of the post ingredient',
      example: '0192e21b-0003-7000-8000-000000000001',
   })
   ingredientId!: string;

   @ApiProperty({
      description: 'Name of the ingredient',
      example: 'Thịt thăn bò tươi',
   })
   name!: string;

   @ApiPropertyOptional({
      description: 'Quantity or amount needed for this dish',
      example: 500,
      nullable: true,
   })
   amount?: number | null;

   @ApiPropertyOptional({
      description: 'Unit of measurement (g, kg, ml, thìa, quả, etc.)',
      example: 'g',
      nullable: true,
   })
   unit?: string | null;

   @ApiPropertyOptional({
      description: 'Group or category for the ingredient (e.g. Nguyên liệu chính, Gia vị nấu nước dùng)',
      example: 'Nguyên liệu chính',
      nullable: true,
   })
   group?: string | null;

   @ApiProperty({
      description: 'Sort order for display in the ingredient drawer',
      example: 1,
   })
   sortOrder!: number;
}
