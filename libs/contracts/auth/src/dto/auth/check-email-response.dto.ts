import { ApiProperty } from '@nestjs/swagger';

export class CheckEmailResponseDto {
   @ApiProperty({
      description: 'Indicates whether the queried email address is available for registration',
      example: true,
   })
   available!: boolean;

   @ApiProperty({
      description: 'The sanitized email address checked',
      example: 'user@example.com',
   })
   email!: string;
}
