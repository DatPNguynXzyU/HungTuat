import { ApiProperty } from '@nestjs/swagger';

export class SimpleSuccessResponseDto {
   @ApiProperty({
      description: 'Indicates whether the requested action completed successfully',
      example: true,
   })
   success!: boolean;

   @ApiProperty({
      description: 'Action result message or translation key',
      example: 'AUTH.LOGOUT_SUCCESS',
   })
   message!: string;
}
