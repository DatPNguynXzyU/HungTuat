import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
   @ApiPropertyOptional({ example: 'Johnathan Doe' })
   @IsOptional()
   @IsString()
   fullName?: string;

   @ApiPropertyOptional({ example: 'https://example.com/avatar.png' })
   @IsOptional()
   @IsString()
   avatar?: string;
}
