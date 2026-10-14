import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendEmailDto {
   @ApiProperty({
      example: 'user@example.com',
      description: 'Recipient email address or array of recipient email addresses',
   })
   @IsNotEmpty()
   to: string | string[];

   @ApiProperty({
      example: 'Welcome to OmniServices!',
      description: 'Email subject',
   })
   @IsString()
   @IsNotEmpty()
   subject: string;

   @ApiPropertyOptional({
      example: '<p>Hello and welcome!</p>',
      description: 'HTML email content',
   })
   @IsString()
   @IsOptional()
   html?: string;

   @ApiPropertyOptional({
      example: 'Hello and welcome!',
      description: 'Plain text email content',
   })
   @IsString()
   @IsOptional()
   text?: string;

   @ApiPropertyOptional({
      example: 'noreply@omniservices.dev',
      description: 'Sender email address (optional, defaults to server configured address)',
   })
   @IsString()
   @IsOptional()
   from?: string;

   @ApiPropertyOptional({
      example: 'support@omniservices.dev',
      description: 'Reply-to email address',
   })
   @IsOptional()
   replyTo?: string | string[];

   @ApiPropertyOptional({
      example: ['team@omniservices.dev'],
      description: 'Carbon copy email addresses',
   })
   @IsOptional()
   @IsArray()
   cc?: string[];

   @ApiPropertyOptional({
      example: ['archive@omniservices.dev'],
      description: 'Blind carbon copy email addresses',
   })
   @IsOptional()
   @IsArray()
   bcc?: string[];
}
