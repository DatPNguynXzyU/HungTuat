import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class DeleteMediaDto {
   @ApiProperty({
      description: 'Unique identifier of the media entity to delete',
      example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
   })
   @IsUUID()
   @IsNotEmpty()
   id!: string;
}
