import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
   @ApiProperty({
      example: 'user@example.com',
      description: 'User email address',
   })
   @IsEmail({}, { message: 'Invalid email address format' })
   @IsNotEmpty({ message: 'Email must not be empty' })
   email: string;

   @ApiProperty({
      example: 'password123',
      description: 'User password (min 6 characters)',
   })
   @IsString({ message: 'Password must be a string' })
   @MinLength(6, { message: 'Password must be at least 6 characters long' })
   @MaxLength(100, { message: 'Password must not exceed 100 characters' })
   password: string;

   @ApiProperty({
      example: 'John Doe',
      description: 'Full name of the user',
   })
   @IsString({ message: 'Full name must be a string' })
   @IsNotEmpty({ message: 'Full name must not be empty' })
   @MinLength(2, { message: 'Full name must be at least 2 characters long' })
   @MaxLength(100, { message: 'Full name must not exceed 100 characters' })
   fullName: string;
}
