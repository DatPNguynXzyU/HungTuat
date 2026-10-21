import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateIngredientDto {
   @ApiProperty({
      description: 'Official name of the cooking ingredient',
      example: 'Thịt thăn bò Wagyu A5',
      maxLength: 150,
   })
   @IsNotEmpty()
   @IsString()
   @MaxLength(150)
   ingredientName!: string;

   @ApiProperty({
      description: 'Culinary description, nutritional info and usage notes (mandatory for food safety)',
      example: 'Thịt bò Wagyu vân mỡ cẩm thạch cao cấp, phù hợp cho món steak hoặc lẩu shabu-shabu.',
   })
   @IsNotEmpty()
   @IsString()
   ingredientDescription!: string;

   @ApiProperty({
      description: 'UUID of the ingredient category',
      example: '0192e21b-0001-7000-8000-000000000001',
   })
   @IsNotEmpty()
   @IsString()
   categoryId!: string;

   @ApiProperty({
      description: 'Default unit of measurement (e.g. g, kg, ml, tbsp)',
      example: 'g',
   })
   @IsNotEmpty()
   @IsString()
   @MaxLength(30)
   defaultUnit!: string;

   @ApiProperty({
      description: 'URL of the ingredient photo asset (mandatory for clear visual recognition)',
      example: 'https://cdn.omniservices.com/ingredients/wagyu-a5.webp',
   })
   @IsNotEmpty()
   @IsString()
   ingredientImageUrl!: string;
}
