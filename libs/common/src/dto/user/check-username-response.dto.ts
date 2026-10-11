import { ApiProperty } from '@nestjs/swagger';

export class CheckUsernameResponseDto {
   @ApiProperty({
      description: 'Indicates whether the queried username is available for registration or change',
      example: true,
   })
   available!: boolean;

   @ApiProperty({
      description: 'The sanitized username checked',
      example: 'john_doe',
   })
   username!: string;
}
