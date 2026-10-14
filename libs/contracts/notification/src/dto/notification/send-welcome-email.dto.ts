import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendWelcomeEmailDto {
   @ApiProperty({
      example: 'user@example.com',
      description: 'Recipient email address',
   })
   @IsEmail()
   @IsNotEmpty()
   to: string;

   @ApiProperty({
      example: 'Nguyen Van A',
      description: 'Recipient full name',
   })
   @IsString()
   @IsNotEmpty()
   fullName: string;

   @ApiPropertyOptional({
      example: 'https://app.omniservices.dev/dashboard',
      description: 'Action URL / getting started URL',
   })
   @IsString()
   @IsOptional()
   actionUrl?: string;
}
