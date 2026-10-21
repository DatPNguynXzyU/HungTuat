import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, Matches } from 'class-validator';
import { UUID_V7_REGEX } from '@common';

export class GetSuppliersByIdsDto {
   @ApiProperty({
      description: 'Array of supplier UUIDv7 identifiers to retrieve',
      example: ['0192e21b-0003-7000-8000-000000000001', '0192e21b-0003-7000-8000-000000000002'],
      type: [String],
   })
   @IsArray()
   @ArrayNotEmpty()
   @Matches(UUID_V7_REGEX, { each: true, message: 'Each supplier ID must be a valid UUIDv7' })
   supplierIds!: string[];
}
