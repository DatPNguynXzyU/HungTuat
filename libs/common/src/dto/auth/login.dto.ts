import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginDto {
   @ApiProperty({
      example: 'user@example.com',
      description: 'User email address',
   })
   @IsEmail()
   @IsNotEmpty()
   email: string;

   @ApiProperty({ example: 'password123', description: 'User password' })
   @IsString()
   @IsNotEmpty()
   password: string;

   @ApiPropertyOptional({ example: '127.0.0.1', description: 'Client IP address' })
   @IsOptional()
   @IsString()
   ip?: string;
}
