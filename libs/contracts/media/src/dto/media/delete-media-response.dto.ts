import { ApiProperty } from '@nestjs/swagger';

export class DeleteMediaResponseDto {
   @ApiProperty({
      description: 'Indicates whether the media entity deletion completed successfully',
      example: true,
   })
   success!: boolean;
}
